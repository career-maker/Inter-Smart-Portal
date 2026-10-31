<?php

namespace App\Http\Controllers\Api\Work;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectBudgetAllocation;
use App\Models\Team;
use App\Models\User;
use App\Models\WorkChange;
use App\Models\WorkSprint;
use App\Support\Access;
use App\Support\Notify;
use App\Support\WorkAccess;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Corrections and changes. The coordinator raises one for a department; that department's team lead sets the effort and
 * cost; the project manager approves it against the department budget (or rejects with a reason); the lead assigns it
 * and the assignee reports it done.
 */
class ChangeController extends Controller
{
    public function index(Request $request, Project $project)
    {
        $user = $request->user();
        abort_unless(WorkAccess::canWork($user, $project), 403, 'This project is not on your work list.');

        $rows = WorkChange::where('project_id', $project->id)->orderByDesc('id')->get();
        $teams = Team::whereIn('id', WorkAccess::allocatedTeamIds($project))->get(['id', 'name', 'team_lead_id']);
        $people = User::whereIn('id', $rows->pluck('assigned_to')->merge($rows->pluck('requested_by'))->filter()->unique())->get()->keyBy('id');
        $nm = fn ($id) => ($u = $people->get($id)) ? trim("{$u->first_name} {$u->last_name}") : null;

        return response()->json([
            'changes' => $rows->map(fn ($c) => $c->toArray() + [
                'team' => $teams->firstWhere('id', $c->team_id)?->name, 'requested_by_name' => $nm($c->requested_by), 'assignee' => $nm($c->assigned_to),
                'can_estimate' => in_array($c->status, ['Requested', 'Rejected'], true) && WorkAccess::canManageSprint($user, $c->team_id),
                'can_assign' => in_array($c->status, ['Approved', 'In progress'], true) && WorkAccess::canManageSprint($user, $c->team_id),
                'can_work' => in_array($c->status, ['Approved', 'In progress'], true) && ($c->assigned_to === $user->id || WorkAccess::canManageSprint($user, $c->team_id)),
            ]),
            'departments' => $teams->map(fn ($t) => ['id' => $t->id, 'name' => $t->name, 'budget' => $b = $this->budget($project->id, $t->id), 'used' => $u = $this->used($project->id, $t->id), 'left' => $b - $u])->values(),
            'members' => $teams->mapWithKeys(fn ($t) => [$t->id => User::where('team_id', $t->id)->get()->map(fn ($u) => ['id' => $u->id, 'name' => trim("{$u->first_name} {$u->last_name}")])->values()]),
            'is_manager' => Access::can('pmo_approve', $user),
            'can_raise' => Access::pmoManager($user) || $project->project_coordinator_id === $user->id,
            'kinds' => WorkChange::KINDS,
        ]);
    }

    public function store(Request $request, Project $project)
    {
        $user = $request->user();
        abort_unless(Access::pmoManager($user) || $project->project_coordinator_id === $user->id, 403, 'Only the coordinator or the project manager can raise a correction or change.');
        $data = $request->validate([
            'team_id' => ['required', Rule::in(WorkAccess::allocatedTeamIds($project))],
            'kind' => ['required', Rule::in(WorkChange::KINDS)],
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
        ]);

        $c = WorkChange::create($data + ['project_id' => $project->id, 'requested_by' => $user->id]);
        $lead = User::where('id', Team::find($c->team_id)?->team_lead_id)->get();
        Notify::users($lead, "{$c->kind} requested", "\"{$project->name}\": {$c->kind} \"{$c->title}\" needs your effort and cost estimate.", 'change_requested', $project->id, $user);

        return response()->json(['data' => $c], 201);
    }

    /** Team lead (or manager) sets effort and cost. The project manager is asked to decide. */
    public function estimate(Request $request, WorkChange $change)
    {
        abort_unless(WorkAccess::canManageSprint($request->user(), $change->team_id), 403, 'Only the department team lead can estimate this.');
        abort_unless(in_array($change->status, ['Requested', 'Estimated', 'Rejected'], true), 422, 'This item can no longer be estimated.');
        $data = $request->validate(['effort_days' => 'required|numeric|gt:0|max:10000', 'cost_estimate' => 'nullable|numeric|min:0|max:100000000']);

        $change->update($data + ['cost_estimate' => $data['cost_estimate'] ?? 0, 'status' => 'Estimated', 'estimated_by' => $request->user()->id, 'decision_note' => null]);
        $project = Project::findOrFail($change->project_id);
        Notify::users(Access::pmoManagers(), "{$change->kind} needs approval", "\"{$project->name}\": \"{$change->title}\" is estimated at {$this->days($change->effort_days)} day(s). Approve or reject it.", 'change_estimated', $project->id, $request->user());

        return response()->json(['data' => $change->fresh()]);
    }

    public function decide(Request $request, WorkChange $change)
    {
        abort_unless(Access::can('pmo_approve', $request->user()), 403, 'Only the project manager can decide this.');
        $data = $request->validate(['decision' => ['required', Rule::in(['approve', 'reject'])], 'note' => 'nullable|string|max:2000', 'allow_over_budget' => 'sometimes|boolean']);
        abort_unless($change->status === 'Estimated', 422, 'This item is not waiting for a decision.');
        $project = Project::findOrFail($change->project_id);
        $told = User::whereIn('id', collect([Team::find($change->team_id)?->team_lead_id, $change->requested_by])->filter()->unique())->get();

        if ($data['decision'] === 'reject') {
            if (empty($data['note'])) {
                return $this->refuse('Give a reason when rejecting.', 'note');
            }
            $change->update(['status' => 'Rejected', 'decided_by' => $request->user()->id, 'decided_at' => now(), 'decision_note' => $data['note']]);
            Notify::users($told, "{$change->kind} rejected", "\"{$project->name}\": \"{$change->title}\" was rejected. {$data['note']}", 'change_decided', $project->id, $request->user());

            return response()->json(['data' => $change->fresh()]);
        }

        $budget = $this->budget($project->id, $change->team_id);
        $total = $this->used($project->id, $change->team_id) + (float) $change->effort_days;
        $over = $total > $budget;
        if ($over && empty($data['allow_over_budget'])) {
            $msg = 'Approved work would take ' . number_format($total, 2) . ' person-days but the department has ' . number_format($budget, 2) . '.';

            return response()->json(['message' => $msg . ' Confirm to go over.', 'errors' => ['decision' => [$msg]], 'over_budget' => true], 422);
        }

        $change->update(['status' => 'Approved', 'decided_by' => $request->user()->id, 'decided_at' => now(), 'decision_note' => $data['note'] ?? null]);
        if ($over) {
            Notify::users(User::role('Super Admin')->get(), "{$change->kind} approved over budget", "\"{$project->name}\": department work now takes " . number_format($total, 2) . ' person-days against ' . number_format($budget, 2) . '.', 'change_over_budget', $project->id, $request->user());
        }
        Notify::users($told, "{$change->kind} approved", "\"{$project->name}\": \"{$change->title}\" was approved. The team lead can assign it.", 'change_decided', $project->id, $request->user());

        return response()->json(['data' => $change->fresh()]);
    }

    public function assign(Request $request, WorkChange $change)
    {
        abort_unless(WorkAccess::canManageSprint($request->user(), $change->team_id), 403, 'Only the department team lead can assign this.');
        abort_unless(in_array($change->status, ['Approved', 'In progress'], true), 422, 'Only approved work can be assigned.');
        $data = $request->validate(['assigned_to' => ['required', Rule::exists('users', 'id')->where('team_id', $change->team_id)]]);

        $change->update($data);
        $project = Project::findOrFail($change->project_id);
        Notify::users(User::where('id', $data['assigned_to'])->get(), "{$change->kind} assigned", "\"{$project->name}\": \"{$change->title}\" ({$this->days($change->effort_days)} day(s)) is yours.", 'change_assigned', $project->id, $request->user());

        return response()->json(['data' => $change->fresh()]);
    }

    /** Assignee (or lead) starts or completes it. Finishing over the effort needs a reason in the note; managers are told. */
    public function progress(Request $request, WorkChange $change)
    {
        $user = $request->user();
        abort_unless($change->assigned_to === $user->id || WorkAccess::canManageSprint($user, $change->team_id), 403, 'Only the assignee or the team lead can update this.');
        abort_unless(in_array($change->status, ['Approved', 'In progress'], true), 422, 'Only approved work can be updated.');
        $data = $request->validate(['status' => ['required', Rule::in(['In progress', 'Completed'])], 'time_spent_days' => 'nullable|numeric|min:0|max:10000', 'note' => 'nullable|string|max:2000']);
        $spent = (float) ($data['time_spent_days'] ?? $change->time_spent_days);
        $project = Project::findOrFail($change->project_id);

        $over = $data['status'] === 'Completed' && $spent > (float) $change->effort_days;
        if ($over && empty($data['note'])) {
            return $this->refuse('You spent more than the planned effort. Say why in the note.', 'note');
        }

        $change->update(['status' => $data['status'], 'time_spent_days' => $spent, 'completed_at' => $data['status'] === 'Completed' ? now() : null]);
        if ($data['status'] === 'Completed') {
            $who = User::whereIn('id', collect([Team::find($change->team_id)?->team_lead_id, $change->requested_by])->filter()->unique())->get();
            Notify::users($who, "{$change->kind} completed", "\"{$project->name}\": \"{$change->title}\" is done.", 'change_completed', $project->id, $user);
            if ($over) {
                Notify::users(Access::pmoManagers(), "{$change->kind} took longer than planned", "\"{$project->name}\": \"{$change->title}\" used {$this->days($spent)} of {$this->days($change->effort_days)} day(s). {$data['note']}", 'change_over_effort', $project->id, $user);
            }
        }

        return response()->json(['data' => $change->fresh()]);
    }

    private function budget(int $projectId, int $teamId): float
    {
        return (float) ProjectBudgetAllocation::where('project_id', $projectId)->where('team_id', $teamId)->sum('amount');
    }

    /** Approved sprints plus approved changes for the department. */
    private function used(int $projectId, int $teamId): float
    {
        return WorkAccess::usedDays($projectId, $teamId);
    }

    private function days($n): string
    {
        return rtrim(rtrim(number_format((float) $n, 2, '.', ''), '0'), '.');
    }

    private function refuse(string $msg, string $field)
    {
        return response()->json(['message' => $msg, 'errors' => [$field => [$msg]]], 422);
    }
}
