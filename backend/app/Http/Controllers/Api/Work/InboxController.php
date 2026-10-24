<?php

namespace App\Http\Controllers\Api\Work;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use App\Models\Project;
use App\Models\ProjectPage;
use App\Models\SprintItem;
use App\Models\Team;
use App\Models\TeamFeedback;
use App\Models\User;
use App\Models\WorkChange;
use App\Models\WorkSprint;
use App\Support\WorkAccess;
use Illuminate\Http\Request;

/**
 * Phase 5. The resource inbox (everything assigned to me, overdue first), the team lead's to-do list across the teams they lead,
 * the team list (open and late work, time spent, leave, feedback), and monthly feedback from four fixed questions.
 */
class InboxController extends Controller
{
    public function inbox(Request $request)
    {
        $user = $request->user();
        $names = fn ($ids) => Project::whereIn('id', $ids)->pluck('name', 'id');
        $today = now()->toDateString();

        // ---- mine
        $items = SprintItem::where('assigned_to', $user->id)->where('status', '!=', 'Approved')->with('sprint')->get();
        $pages = ProjectPage::where('assigned_to', $user->id)->where('approval', 'Approved')->where('status', '!=', 'Completed')->get();
        $changes = WorkChange::where('assigned_to', $user->id)->whereIn('status', ['Approved', 'In progress'])->get();
        $projects = $names($items->pluck('sprint.project_id')->merge($pages->pluck('project_id'))->merge($changes->pluck('project_id'))->filter()->unique());

        $mine = collect();
        foreach ($items as $i) {
            $due = $i->sprint?->end_date?->toDateString();
            $mine->push(['kind' => 'Sprint task', 'id' => $i->id, 'project_id' => $i->sprint?->project_id, 'title' => $i->title, 'status' => $i->status, 'due' => $due, 'effort_days' => (float) $i->effort_days, 'spent_days' => (float) $i->time_spent_days]);
        }
        foreach ($pages as $p) {
            $mine->push(['kind' => 'Design page', 'id' => $p->id, 'project_id' => $p->project_id, 'title' => $p->title, 'status' => $p->status, 'due' => $p->due_date?->toDateString(), 'effort_days' => null, 'spent_days' => null]);
        }
        foreach ($changes as $c) {
            $mine->push(['kind' => $c->kind, 'id' => $c->id, 'project_id' => $c->project_id, 'title' => $c->title, 'status' => $c->status, 'due' => null, 'effort_days' => (float) $c->effort_days, 'spent_days' => (float) $c->time_spent_days]);
        }
        $mine = $mine->map(fn ($r) => $r + ['project' => $projects[$r['project_id']] ?? null, 'overdue' => $r['due'] !== null && $r['due'] < $today, 'over_effort' => $r['effort_days'] !== null && $r['spent_days'] > $r['effort_days']])
            ->sortBy([['overdue', 'desc'], ['due', 'asc']])->values();

        // ---- lead to-do
        $teamIds = WorkAccess::ledTeamIds($user);
        $todo = collect();
        if ($teamIds) {
            $sprints = WorkSprint::whereIn('team_id', $teamIds)->get();
            foreach ($sprints as $s) {
                $what = match (true) {
                    in_array($s->status, ['Draft', 'Rejected'], true) => 'Finish and submit the sprint',
                    $s->status === 'Approved' && $s->requested_start !== null => 'Confirm the requested dates',
                    $s->status === 'Approved' => 'Approved: waiting for dates from the coordinator',
                    default => null,
                };
                if ($what && ! str_starts_with($what, 'Approved: waiting')) {
                    $todo->push(['kind' => 'Sprint', 'project_id' => $s->project_id, 'title' => $s->title, 'action' => $what, 'due' => $s->requested_end?->toDateString()]);
                }
            }
            foreach (SprintItem::whereIn('sprint_id', $sprints->pluck('id'))->where('status', 'Waiting for approval')->get() as $i) {
                $todo->push(['kind' => 'Sprint task', 'project_id' => $sprints->firstWhere('id', $i->sprint_id)?->project_id, 'title' => $i->title, 'action' => 'Verify and approve the finished task', 'due' => null]);
            }
            foreach (WorkChange::whereIn('team_id', $teamIds)->whereIn('status', ['Requested', 'Rejected'])->get() as $c) {
                $todo->push(['kind' => $c->kind, 'project_id' => $c->project_id, 'title' => $c->title, 'action' => 'Set the effort and cost', 'due' => null]);
            }
            foreach (WorkChange::whereIn('team_id', $teamIds)->where('status', 'Approved')->whereNull('assigned_to')->get() as $c) {
                $todo->push(['kind' => $c->kind, 'project_id' => $c->project_id, 'title' => $c->title, 'action' => 'Assign to a team member', 'due' => null]);
            }
            $uiTeams = array_intersect($teamIds, WorkAccess::uiTeamIds());
            if ($uiTeams) {
                foreach (ProjectPage::where('approval', 'Approved')->whereNull('assigned_to')->where('status', '!=', 'Completed')->get() as $p) {
                    if (array_intersect(WorkAccess::allocatedTeamIds(Project::findOrFail($p->project_id)), $uiTeams)) {
                        $todo->push(['kind' => 'Design page', 'project_id' => $p->project_id, 'title' => $p->title, 'action' => 'Assign a designer', 'due' => $p->due_date?->toDateString()]);
                    }
                }
            }
            $leadProjects = $names($todo->pluck('project_id')->filter()->unique());
            $todo = $todo->map(fn ($r) => $r + ['project' => $leadProjects[$r['project_id']] ?? null, 'overdue' => $r['due'] !== null && $r['due'] < $today])->sortBy([['overdue', 'desc'], ['due', 'asc']])->values();
        }

        return response()->json(['mine' => $mine, 'lead_todo' => $todo, 'is_lead' => (bool) $teamIds]);
    }

    /** Members of the teams I lead: open and late work, days spent this month, leave this month, latest feedback. */
    public function team(Request $request)
    {
        $user = $request->user();
        $teams = Team::whereIn('id', WorkAccess::ledTeamIds($user))->get();
        abort_if($teams->isEmpty(), 403, 'Only a team lead has a team list.');
        $month = now()->format('Y-m');
        $from = now()->startOfMonth()->toDateString();
        $to = now()->endOfMonth()->toDateString();
        $today = now()->toDateString();

        $members = User::whereIn('team_id', $teams->pluck('id'))->where('id', '!=', $user->id)->orderBy('first_name')->get();
        $rows = $members->map(function ($m) use ($month, $from, $to, $today, $user, $teams) {
            $open = SprintItem::where('assigned_to', $m->id)->where('status', '!=', 'Approved')->with('sprint')->get();
            $late = $open->filter(fn ($i) => $i->sprint?->end_date && $i->sprint->end_date->toDateString() < $today)->count()
                + ProjectPage::where('assigned_to', $m->id)->where('status', '!=', 'Completed')->whereNotNull('due_date')->where('due_date', '<', $today)->count();
            $fb = TeamFeedback::where('user_id', $m->id)->orderByDesc('month')->first();

            return [
                'id' => $m->id, 'name' => trim("{$m->first_name} {$m->last_name}"), 'team' => $teams->firstWhere('id', $m->team_id)?->name,
                'open_tasks' => $open->count() + ProjectPage::where('assigned_to', $m->id)->where('status', '!=', 'Completed')->count() + WorkChange::where('assigned_to', $m->id)->whereIn('status', ['Approved', 'In progress'])->count(),
                'late_tasks' => $late,
                'days_spent_month' => (float) SprintItem::where('assigned_to', $m->id)->whereBetween('updated_at', [$from, $to . ' 23:59:59'])->sum('time_spent_days'),
                'leave_days_month' => (float) LeaveRequest::where('user_id', $m->id)->where('status', 'Approved')->whereBetween('start_date', [$from, $to])->sum('days'),
                'feedback_this_month' => TeamFeedback::where('user_id', $m->id)->where('given_by', $user->id)->where('month', $month)->first(),
                'average_rating' => $fb ? round(($fb->attitude + $fb->attire + $fb->learning + $fb->on_time) / 4, 1) : null,
            ];
        });

        return response()->json(['members' => $rows, 'questions' => TeamFeedback::QUESTIONS, 'month' => $month]);
    }

    public function feedback(Request $request, User $member)
    {
        $user = $request->user();
        abort_unless($member->team_id && WorkAccess::isLeadOf($user, $member->team_id) && $member->id !== $user->id, 403, 'You can only give feedback to people on a team you lead.');
        $data = $request->validate(collect(array_keys(TeamFeedback::QUESTIONS))->mapWithKeys(fn ($f) => [$f => 'required|integer|between:1,5'])->all() + ['comment' => 'nullable|string|max:2000']);

        $row = TeamFeedback::updateOrCreate(['user_id' => $member->id, 'given_by' => $user->id, 'month' => now()->format('Y-m')], $data + ['team_id' => $member->team_id]);

        return response()->json(['data' => $row]);
    }
}
