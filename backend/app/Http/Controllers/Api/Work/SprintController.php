<?php

namespace App\Http\Controllers\Api\Work;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectBudgetAllocation;
use App\Models\SprintEvent;
use App\Models\SprintItem;
use App\Models\Team;
use App\Models\User;
use App\Models\WorkSprint;
use App\Support\Access;
use App\Support\Notify;
use App\Support\QaHandoff;
use App\Support\WorkAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * UX / Dev sprints. Team lead plans a sprint (items with effort, one cost estimate) and submits it; the project manager
 * approves against the department's budget; the coordinator asks for dates; the team lead schedules; resources report progress.
 */
class SprintController extends Controller
{
    private const EDITABLE = ['Draft', 'Rejected'];

    public function index(Request $request, Project $project)
    {
        $user = $request->user();
        abort_unless(WorkAccess::canWork($user, $project), 403, 'This project is not on your work list.');

        $sprints = WorkSprint::where('project_id', $project->id)->withCount('items')->orderByDesc('id')->get();
        $teams = Team::whereIn('id', WorkAccess::sprintTeamIds($project))->get(['id', 'name', 'team_lead_id']);
        $done = SprintItem::whereIn('sprint_id', $sprints->pluck('id'))->selectRaw('sprint_id, count(*) as total, sum(status = ?) as approved, sum(effort_days) as effort', ['Approved'])->groupBy('sprint_id')->get()->keyBy('sprint_id');

        return response()->json([
            'sprints' => $sprints->map(fn ($s) => $s->toArray() + [
                'team' => $teams->firstWhere('id', $s->team_id)?->name ?? Team::find($s->team_id)?->name,
                'effort_days' => (float) ($done[$s->id]->effort ?? 0), 'items_approved' => (int) ($done[$s->id]->approved ?? 0),
            ]),
            'departments' => $teams->map(function ($t) use ($project, $user) {
                $alloc = (float) ProjectBudgetAllocation::where('project_id', $project->id)->where('team_id', $t->id)->sum('amount');
                $used = $this->approvedCost($project->id, $t->id);

                return ['id' => $t->id, 'name' => $t->name, 'budget' => $alloc, 'approved_cost' => $used, 'left' => $alloc - $used, 'can_plan' => WorkAccess::canManageSprint($user, $t->id)];
            })->values(),
            'is_manager' => Access::can('pmo_approve', $user), 'is_coordinator' => $project->project_coordinator_id === $user->id,
        ]);
    }

    public function show(Request $request, WorkSprint $sprint)
    {
        $project = Project::findOrFail($sprint->project_id);
        $user = $request->user();
        abort_unless(WorkAccess::canWork($user, $project), 403, 'This project is not on your work list.');

        $items = $sprint->items()->get();
        $names = User::whereIn('id', $items->pluck('assigned_to')->merge(SprintEvent::where('sprint_id', $sprint->id)->pluck('user_id'))->filter()->unique())->get()->keyBy('id');
        $nm = fn ($id) => ($u = $names->get($id)) ? trim("{$u->first_name} {$u->last_name}") : null;
        $team = Team::with('members:id,first_name,last_name,team_id')->find($sprint->team_id);
        $budget = (float) ProjectBudgetAllocation::where('project_id', $project->id)->where('team_id', $sprint->team_id)->sum('amount');
        $used = $this->approvedCost($project->id, $sprint->team_id, $sprint->id);

        return response()->json([
            'sprint' => $sprint->toArray() + ['team' => $team?->name],
            'items' => $items->map(fn ($i) => $i->toArray() + ['assignee' => $nm($i->assigned_to)]),
            'events' => SprintEvent::where('sprint_id', $sprint->id)->orderByDesc('id')->get()->map(fn ($e) => $e->toArray() + ['user' => $nm($e->user_id)]),
            'members' => ($team?->members ?? collect())->map(fn ($u) => ['id' => $u->id, 'name' => trim("{$u->first_name} {$u->last_name}")])->values(),
            'budget' => ['department' => $budget, 'other_approved' => $used, 'left' => $budget - $used],
            'item_statuses' => SprintItem::STATUSES,
            'can_manage' => WorkAccess::canManageSprint($user, $sprint->team_id), 'is_manager' => Access::can('pmo_approve', $user),
            'is_coordinator' => $project->project_coordinator_id === $user->id,
            'totals' => ['effort_days' => (float) $items->sum('effort_days'), 'spent_days' => (float) $items->sum('time_spent_days')],
        ]);
    }

    public function store(Request $request, Project $project)
    {
        $data = $request->validate(['team_id' => 'required|integer', 'title' => 'required|string|max:255', 'cost_estimate' => 'nullable|numeric|min:0']);
        abort_unless(in_array((int) $data['team_id'], WorkAccess::sprintTeamIds($project), true), 422, 'That department has no budget on this project.');
        abort_unless(WorkAccess::canManageSprint($request->user(), (int) $data['team_id']), 403, 'Only the department team lead or the project manager can plan a sprint.');
        WorkAccess::requireOpenTab($project, 'dev');

        $sprint = WorkSprint::create($data + ['project_id' => $project->id, 'created_by' => $request->user()->id, 'cost_estimate' => $data['cost_estimate'] ?? 0]);
        $this->log($sprint, null, $request->user(), null, 'Draft', 'Sprint created');

        return response()->json(['data' => $sprint], 201);
    }

    public function update(Request $request, WorkSprint $sprint)
    {
        $this->requirePlanner($request, $sprint);
        $this->requireEditable($sprint);
        $data = $request->validate(['title' => 'sometimes|required|string|max:255', 'cost_estimate' => 'nullable|numeric|min:0']);
        $sprint->update($data);

        return response()->json(['data' => $sprint->fresh()]);
    }

    // ---- items -----------------------------------------------------------------

    public function storeItem(Request $request, WorkSprint $sprint)
    {
        $this->requirePlanner($request, $sprint);
        $this->requireEditable($sprint);
        $data = $request->validate(['title' => 'required|string|max:255', 'effort_days' => 'required|numeric|gt:0|max:1000', 'assigned_to' => 'nullable|integer']);
        $this->checkAssignee($sprint, $data['assigned_to'] ?? null);

        $item = SprintItem::create($data + ['sprint_id' => $sprint->id, 'position' => $sprint->items()->count() + 1]);

        return response()->json(['data' => $item], 201);
    }

    public function updateItem(Request $request, SprintItem $item)
    {
        $sprint = $item->sprint;
        $this->requirePlanner($request, $sprint);
        $data = $request->validate(['title' => 'sometimes|required|string|max:255', 'effort_days' => 'sometimes|numeric|gt:0|max:1000', 'assigned_to' => 'nullable|integer']);
        if (array_key_exists('title', $data) || array_key_exists('effort_days', $data)) {
            $this->requireEditable($sprint); // effort is what the project manager approved: change it only before approval
        }
        $this->checkAssignee($sprint, $data['assigned_to'] ?? null);
        $was = $item->assigned_to;
        $item->update($data);
        if (! empty($data['assigned_to']) && (int) $data['assigned_to'] !== (int) $was && in_array($sprint->status, ['Scheduled', 'In progress'], true)) {
            Notify::users(User::where('id', $data['assigned_to'])->get(), 'Task assigned', "You were given \"{$item->title}\" in sprint \"{$sprint->title}\".", 'item_assigned', $sprint->project_id, $request->user());
        }

        return response()->json(['data' => $item->fresh()]);
    }

    public function destroyItem(Request $request, SprintItem $item)
    {
        $sprint = $item->sprint;
        $this->requirePlanner($request, $sprint);
        $this->requireEditable($sprint);
        $item->delete();

        return response()->json(['message' => 'Deleted.']);
    }

    // ---- approval path ----------------------------------------------------------

    public function submit(Request $request, WorkSprint $sprint)
    {
        $this->requirePlanner($request, $sprint);
        $this->requireEditable($sprint);
        $items = $sprint->items()->get();
        if ($items->isEmpty() || (float) $items->sum('effort_days') <= 0) {
            return $this->refuse('Add at least one item with effort before submitting.', 'title');
        }

        $this->move($sprint, 'Submitted', $request->user(), null);
        $project = Project::find($sprint->project_id);
        Notify::users(Access::pmoManagers(), 'Sprint needs approval', "\"{$project->name}\": sprint \"{$sprint->title}\" ({$items->sum('effort_days')} days, cost " . number_format((float) $sprint->cost_estimate, 2) . ') is waiting for your approval.', 'sprint_submitted', $project->id, $request->user());

        return response()->json(['data' => $sprint->fresh()]);
    }

    /** Project manager approves against the department budget (over budget needs a confirmation) or rejects with a reason. */
    public function decide(Request $request, WorkSprint $sprint)
    {
        abort_unless(Access::can('pmo_approve', $request->user()), 403, 'Only the project manager can decide this.');
        $data = $request->validate(['decision' => ['required', Rule::in(['approve', 'reject'])], 'note' => 'nullable|string|max:2000', 'allow_over_budget' => 'sometimes|boolean']);
        abort_unless($sprint->status === 'Submitted', 422, 'This sprint is not waiting for a decision.');
        $project = Project::findOrFail($sprint->project_id);

        if ($data['decision'] === 'reject') {
            if (empty($data['note'])) {
                return $this->refuse('Give a reason when rejecting.', 'note');
            }
            $sprint->update(['decided_by' => $request->user()->id, 'decided_at' => now(), 'decision_note' => $data['note']]);
            $this->move($sprint, 'Rejected', $request->user(), $data['note']);
            Notify::users($this->planners($sprint), 'Sprint rejected', "\"{$project->name}\": sprint \"{$sprint->title}\" was rejected. {$data['note']}", 'sprint_decided', $project->id, $request->user());

            return response()->json(['data' => $sprint->fresh()]);
        }

        $budget = (float) ProjectBudgetAllocation::where('project_id', $project->id)->where('team_id', $sprint->team_id)->sum('amount');
        $total = $this->approvedCost($project->id, $sprint->team_id, $sprint->id) + (float) $sprint->cost_estimate;
        $over = $total > $budget;
        if ($over && empty($data['allow_over_budget'])) {
            $msg = 'Approved sprints would cost ' . number_format($total, 2) . ' but the department budget is ' . number_format($budget, 2) . '.';

            return response()->json(['message' => $msg . ' Confirm to go over.', 'errors' => ['decision' => [$msg]], 'over_budget' => true], 422);
        }

        $sprint->update(['decided_by' => $request->user()->id, 'decided_at' => now(), 'decision_note' => $data['note'] ?? null]);
        $this->move($sprint, 'Approved', $request->user(), $data['note'] ?? null);
        if ($over) {
            Notify::users(User::role('Super Admin')->get(), 'Sprint approved over budget', "\"{$project->name}\": department sprints now cost " . number_format($total, 2) . ' against a budget of ' . number_format($budget, 2) . '.', 'sprint_over_budget', $project->id, $request->user());
        }
        Notify::users($this->planners($sprint)->merge(User::where('id', $project->project_coordinator_id)->get()), 'Sprint approved', "\"{$project->name}\": sprint \"{$sprint->title}\" was approved. The coordinator can now ask for dates.", 'sprint_decided', $project->id, $request->user());

        return response()->json(['data' => $sprint->fresh()]);
    }

    /** Coordinator asks the team lead for start and end dates. */
    public function requestDates(Request $request, WorkSprint $sprint)
    {
        $project = Project::findOrFail($sprint->project_id);
        abort_unless($project->project_coordinator_id === $request->user()->id || Access::pmoManager($request->user()), 403, 'Only the coordinator or the project manager can ask for dates.');
        abort_unless($sprint->status === 'Approved', 422, 'Dates can be requested once the sprint is approved and before it is scheduled.');
        $data = $request->validate(['start' => 'required|date', 'end' => 'required|date|after_or_equal:start']);

        $sprint->update(['requested_start' => $data['start'], 'requested_end' => $data['end']]);
        $this->log($sprint, null, $request->user(), 'Approved', 'Approved', "Dates requested: {$data['start']} to {$data['end']}");
        Notify::users($this->planners($sprint), 'Dates requested', "\"{$project->name}\": the coordinator asks to run sprint \"{$sprint->title}\" from {$data['start']} to {$data['end']}.", 'sprint_dates_requested', $project->id, $request->user());

        return response()->json(['data' => $sprint->fresh()]);
    }

    /** Team lead confirms the dates (defaults to the requested ones); the assigned people are told. */
    public function schedule(Request $request, WorkSprint $sprint)
    {
        $this->requirePlanner($request, $sprint);
        abort_unless($sprint->status === 'Approved', 422, 'Only an approved sprint can be scheduled.');
        $data = $request->validate(['start' => 'nullable|date', 'end' => 'nullable|date|after_or_equal:start']);
        $start = $data['start'] ?? $sprint->requested_start?->toDateString();
        $end = $data['end'] ?? $sprint->requested_end?->toDateString();
        if (! $start || ! $end) {
            return $this->refuse('Give a start and end date, or wait for the coordinator to request them.', 'start');
        }

        $sprint->update(['start_date' => $start, 'end_date' => $end]);
        $this->move($sprint, 'Scheduled', $request->user(), "Dates: {$start} to {$end}");
        $project = Project::find($sprint->project_id);
        Notify::users(User::whereIn('id', $sprint->items()->pluck('assigned_to')->filter()->unique())->get(), 'Sprint scheduled', "\"{$project->name}\": sprint \"{$sprint->title}\" runs {$start} to {$end}. Your tasks are ready.", 'sprint_scheduled', $project->id, $request->user());
        Notify::users(User::where('id', $project->project_coordinator_id)->get(), 'Sprint scheduled', "\"{$project->name}\": sprint \"{$sprint->title}\" is scheduled {$start} to {$end}.", 'sprint_scheduled', $project->id, $request->user());

        return response()->json(['data' => $sprint->fresh()]);
    }

    // ---- daily work ---------------------------------------------------------------

    /** The assignee (or planner) updates an item and the time spent. Finishing an overspent item needs a reason. */
    public function itemStatus(Request $request, SprintItem $item)
    {
        $sprint = $item->sprint;
        $project = Project::findOrFail($sprint->project_id);
        $user = $request->user();
        abort_unless($item->assigned_to === $user->id || WorkAccess::canManageSprint($user, $sprint->team_id) || $project->project_coordinator_id === $user->id, 403, 'This task is not assigned to you.');
        abort_unless(in_array($sprint->status, ['Scheduled', 'In progress'], true), 422, 'The sprint has to be scheduled before work can be reported.');
        $data = $request->validate(['status' => ['required', Rule::in(SprintItem::STATUSES)], 'note' => 'nullable|string|max:2000', 'time_spent_days' => 'nullable|numeric|min:0|max:1000']);

        $spent = array_key_exists('time_spent_days', $data) && $data['time_spent_days'] !== null ? (float) $data['time_spent_days'] : (float) $item->time_spent_days;
        $over = $spent > (float) $item->effort_days;
        if ($over && in_array($data['status'], ['Completed', 'Waiting for approval', 'Approved'], true) && empty($data['note'])) {
            return $this->refuse('Say why the effort was exceeded (' . rtrim(rtrim((string) $spent, '0'), '.') . ' days spent against ' . rtrim(rtrim((string) $item->effort_days, '0'), '.') . ' planned).', 'note');
        }
        if ($data['status'] === $item->status && $spent === (float) $item->time_spent_days) {
            return response()->json(['message' => "Nothing changed: the task is already {$item->status}."], 422);
        }

        $from = $item->status;
        DB::transaction(function () use ($item, $sprint, $data, $spent, $from, $user) {
            $item->update(['status' => $data['status'], 'time_spent_days' => $spent]);
            if ($from !== $data['status']) {
                $this->log($sprint, $item, $user, $from, $data['status'], $data['note'] ?? null);
            }
            if ($sprint->status === 'Scheduled' && $data['status'] !== 'Pending') {
                $this->move($sprint, 'In progress', $user, null);
            }
            if ($sprint->items()->where('status', '!=', 'Approved')->doesntExist()) {
                $this->move($sprint, 'Completed', $user, 'All tasks approved');
            }
        });

        $sprint->refresh();
        $leads = User::whereIn('id', [Team::find($sprint->team_id)?->team_lead_id])->get();
        if ($data['status'] === 'Completed' && $from !== 'Completed') {
            QaHandoff::open($item, $user);
        }
        if ($data['status'] === 'Completed') {
            Notify::users($leads, 'Task completed', "\"{$project->name}\": \"{$item->title}\" is completed and ready for review.", 'item_completed', $project->id, $user);
        }
        if ($over && $from !== $data['status'] && in_array($data['status'], ['Completed', 'Waiting for approval', 'Approved'], true)) {
            Notify::users($leads->merge(Access::pmoManagers()), 'Effort exceeded', "\"{$project->name}\": \"{$item->title}\" took {$spent} days against {$item->effort_days} planned. {$data['note']}", 'effort_exceeded', $project->id, $user);
        }
        if ($sprint->status === 'Completed') {
            Notify::users(Access::pmoManagers()->merge(User::where('id', $project->project_coordinator_id)->get()), 'Sprint completed', "\"{$project->name}\": sprint \"{$sprint->title}\" is complete.", 'sprint_completed', $project->id, $user);
            $planned = (float) $sprint->items()->sum('effort_days');
            $spentAll = (float) $sprint->items()->sum('time_spent_days');
            if ($spentAll > $planned) {
                // Effort went over the plan: the project manager and management are told.
                Notify::users(Access::pmoManagers()->merge(User::role('Super Admin')->get()), 'Sprint went over its effort', "\"{$project->name}\": sprint \"{$sprint->title}\" took {$spentAll} days against {$planned} planned.", 'sprint_over_effort', $project->id, $user);
            }
        }

        return response()->json(['data' => $item->fresh(), 'sprint_status' => $sprint->status]);
    }

    // ---- helpers ------------------------------------------------------------------

    private function approvedCost(int $projectId, int $teamId, ?int $excludeId = null): float
    {
        return (float) WorkSprint::where('project_id', $projectId)->where('team_id', $teamId)->whereIn('status', WorkSprint::OPEN_STATUSES)
            ->when($excludeId, fn ($q) => $q->where('id', '!=', $excludeId))->sum('cost_estimate');
    }

    private function planners(WorkSprint $sprint)
    {
        $lead = Team::find($sprint->team_id)?->team_lead_id;

        return User::whereIn('id', collect([$lead, $sprint->created_by])->filter()->unique())->get();
    }

    private function requirePlanner(Request $request, WorkSprint $sprint): void
    {
        abort_unless(WorkAccess::canManageSprint($request->user(), $sprint->team_id), 403, 'Only the department team lead or the project manager can do this.');
        WorkAccess::requireOpenTab(Project::findOrFail($sprint->project_id), 'dev');
    }

    private function requireEditable(WorkSprint $sprint): void
    {
        abort_unless(in_array($sprint->status, self::EDITABLE, true), 422, "A {$sprint->status} sprint can no longer be changed. The approved effort stays as approved.");
    }

    private function checkAssignee(WorkSprint $sprint, $userId): void
    {
        if ($userId) {
            $u = User::find($userId);
            abort_unless($u && (int) $u->team_id === (int) $sprint->team_id, 422, 'Tasks can only be given to people in the sprint\'s department.');
        }
    }

    private function move(WorkSprint $sprint, string $to, User $user, ?string $note): void
    {
        $from = $sprint->status;
        $sprint->update(['status' => $to]);
        $this->log($sprint, null, $user, $from, $to, $note);
    }

    private function log(WorkSprint $sprint, ?SprintItem $item, User $user, ?string $from, string $to, ?string $note): void
    {
        SprintEvent::create(['sprint_id' => $sprint->id, 'item_id' => $item?->id, 'user_id' => $user->id, 'from_status' => $from, 'to_status' => $to, 'note' => $note]);
    }

    private function refuse(string $msg, string $field)
    {
        return response()->json(['message' => $msg, 'errors' => [$field => [$msg]]], 422);
    }
}
