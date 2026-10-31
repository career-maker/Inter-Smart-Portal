<?php

namespace App\Http\Controllers\Api\Pmo;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\OutOfScopeRequest;
use App\Models\Project;
use App\Models\ProjectAcceptance;
use App\Models\ProjectBudgetAllocation;
use App\Models\ProjectBusinessAnalysis;
use App\Models\ProjectFinance;
use App\Models\ProjectHold;
use App\Models\ProjectIntake;
use App\Models\ProjectOverride;
use App\Models\ProjectPayment;
use App\Models\ProjectResource;
use App\Models\ProjectTask;
use App\Models\Team;
use App\Models\User;
use App\Support\Access;
use App\Support\Notify;
use App\Support\ProjectGate;
use App\Support\ProjectPaymentState;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/** Project Office: project list, coordinator assignment/acceptance, department budgets, holds, tab-lock overrides. */
class PmoProjectController extends Controller
{
    public const HOLD_REASONS = [
        'approval' => 'Waiting for client approval', 'content' => 'Waiting for content', 'images' => 'Waiting for images',
        'payment_gateway' => 'Payment gateway details', 'sms' => 'SMS details', 'smtp' => 'SMTP details',
        'no_response' => 'No response from client', 'out_of_scope' => 'Out of scope request', 'too_many_corrections' => 'Too many / repeated corrections',
        'payment_pending' => 'Payment pending', 'budget_exceeded' => 'Budget exceeded', 'date_exceeded' => 'Date exceeded', 'other' => 'Other',
    ];

    public function meta(Request $request)
    {
        return response()->json([
            'hold_reasons' => collect(self::HOLD_REASONS)->map(fn ($l, $k) => ['code' => $k, 'label' => $l])->values(),
            // Delivery departments only: the office teams (PMO, Sales, Accounts) get no project budget.
            'departments' => Team::orderBy('name')->get(['id', 'name'])->reject(fn ($t) => preg_match('/^(pmo|sales|accounts)/i', trim($t->name)))->values(),
            'coordinators' => Access::teamMembers(['pmo'])->map(fn ($u) => ['id' => $u->id, 'name' => trim("{$u->first_name} {$u->last_name}"), 'team' => $u->team?->name])->values(),
            'is_manager' => Access::pmoManager($request->user()),
        ]);
    }

    /**
     * Sales-pipeline projects (those with a finance or coordinator record) by default; scope=all adds the older projects.
     * Managers see everything; a coordinator sees the projects assigned to them.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $manager = Access::pmoManager($user);

        $q = Project::query();
        if (! $manager) {
            $q->where('project_coordinator_id', $user->id);
        } elseif ($request->input('scope') !== 'all') {
            $q->where(fn ($w) => $w->whereIn('id', ProjectFinance::select('project_id'))->orWhereIn('id', ProjectAcceptance::select('project_id')));
        }
        if ($request->filled('status')) {
            $q->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $q->where('name', 'like', '%' . $request->search . '%');
        }
        if ($request->filled('coordinator_id')) {
            $q->where('project_coordinator_id', $request->coordinator_id);
        }

        $projects = $q->orderByDesc('id')->limit(300)->get();
        $ids = $projects->pluck('id');
        $finance = ProjectFinance::whereIn('project_id', $ids)->get()->keyBy('project_id');
        $payments = ProjectPayment::whereIn('project_id', $ids)->get()->groupBy('project_id');
        $alloc = ProjectBudgetAllocation::whereIn('project_id', $ids)->selectRaw('project_id, sum(amount) as total')->groupBy('project_id')->pluck('total', 'project_id');
        $accept = ProjectAcceptance::whereIn('project_id', $ids)->get()->keyBy('project_id');
        $holds = ProjectHold::whereIn('project_id', $ids)->whereNull('cleared_at')->get()->keyBy('project_id');
        $oos = OutOfScopeRequest::whereIn('project_id', $ids)->where('status', 'Pending')->selectRaw('project_id, count(*) as c')->groupBy('project_id')->pluck('c', 'project_id');
        $tasks = ProjectTask::whereIn('project_id', $ids)->selectRaw('project_id, count(*) as total, sum(status = ?) as done', ['Completed'])->groupBy('project_id')->get()->keyBy('project_id');
        $users = User::whereIn('id', $projects->pluck('project_coordinator_id')->merge($finance->pluck('sales_user_id'))->filter()->unique())->get()->keyBy('id');
        $name = fn ($id) => $id && $users->has($id) ? trim($users[$id]->first_name . ' ' . $users[$id]->last_name) : null;

        $sees = Access::seesProjectCost($user);
        $paymentOverride = ProjectOverride::whereIn('project_id', $ids)->where('type', 'payment')->pluck('project_id')->flip();
        $rows = $projects->map(function ($p) use ($finance, $payments, $alloc, $accept, $holds, $oos, $tasks, $name, $sees) {
            $pay = ProjectPaymentState::for($finance->get($p->id), $payments->get($p->id, collect()));
            $hide = ! $sees ? ['contract_value' => null, 'received' => null, 'balance' => null] : [];
            $t = $tasks->get($p->id);
            $hold = $holds->get($p->id);

            return [
                'id' => $p->id, 'name' => $p->name, 'status' => $p->status,
                'hold_reason' => $hold ? (self::HOLD_REASONS[$hold->reason_code] ?? $hold->reason_code) : null,
                'coordinator_id' => $p->project_coordinator_id, 'coordinator' => $name($p->project_coordinator_id),
                'accepted' => (bool) $accept->get($p->id)?->accepted_at,
                'sales_person' => $name($finance->get($p->id)?->sales_user_id),
                'allocated' => (float) ($alloc[$p->id] ?? 0), 'unallocated' => $sees ? (float) $pay['contract_value'] - (float) ($alloc[$p->id] ?? 0) : null,
                'pending_out_of_scope' => (int) ($oos[$p->id] ?? 0),
                'progress_percent' => $t && $t->total > 0 ? (int) round(100 * $t->done / $t->total) : null,
                'date_exceeded' => $p->expected_end_date && $p->expected_end_date->isPast() && ! in_array($p->status, ['Completed', 'Cancelled'], true),
            ] + $hide + $pay;
        });

        if ($request->filled('payment_state')) {
            $rows = $rows->where('state', $request->payment_state);
        } elseif ($request->input('scope') !== 'all') {
            // A project reaches the Project Office only by an approved advance, a purchase order, an Accounts override, or a Super Admin payment override.
            $rows = $rows->reject(fn ($r) => in_array($r['state'], [ProjectPaymentState::NO_RECORD, ProjectPaymentState::ADVANCE_AWAITING], true) && ! $paymentOverride->has($r['id']));
        }

        return response()->json(['data' => $rows->values()]);
    }

    public function show(Request $request, Project $project)
    {
        $this->authorizeView($request, $project);
        $gate = $this->gateFor($request, $project);
        $sees = Access::seesProjectCost($request->user());
        $intake = ProjectIntake::where('project_id', $project->id)->first();
        if (! $sees) {
            $intake?->makeHidden(['budget', 'currency']);
        }

        return response()->json([
            'can_see_cost' => $sees,
            'can_decide_oos' => Access::can('pmo_approve', $request->user()) || $project->project_coordinator_id === $request->user()->id,
            'usage' => collect(['design' => 'Design', 'frontend' => 'Frontend (HTML)', 'dev' => 'Dev'])
                ->map(fn ($label, $kind) => ['kind' => $kind, 'label' => $label] + \App\Http\Controllers\Api\Work\TrackerController::figures($project, $kind))->values(),
            'project' => $project->only(['id', 'name', 'status', 'description', 'project_coordinator_id', 'start_date', 'expected_end_date']),
            'intake' => $intake,
            'acceptance' => ProjectAcceptance::where('project_id', $project->id)->first(),
            'hold' => ProjectHold::where('project_id', $project->id)->whereNull('cleared_at')->first(),
            'allocations' => ProjectBudgetAllocation::with('team:id,name')->where('project_id', $project->id)->get(),
            'overrides' => ProjectOverride::where('project_id', $project->id)->get(),
            'business_analysis' => ProjectBusinessAnalysis::where('project_id', $project->id)->first(),
            'resources' => ProjectResource::where('project_id', $project->id)->orderByDesc('id')->get(),
            'out_of_scope' => OutOfScopeRequest::where('project_id', $project->id)->orderByDesc('id')->get(),
            'gate' => $gate,
            'can_manage' => Access::pmoManager($request->user()),
            'is_super_admin' => $request->user()->hasRole('Super Admin'),
        ]);
    }

    public function assign(Request $request, Project $project)
    {
        $this->requireManager($request, 'pmo_assign');
        $data = $request->validate(['coordinator_id' => 'required|exists:users,id']);
        $coordinator = User::with('team')->findOrFail($data['coordinator_id']);
        abort_unless(Access::inTeam($coordinator, 'pmo'), 422, 'A coordinator must belong to a PMO team.');

        DB::transaction(function () use ($project, $coordinator, $request) {
            $project->update(['project_coordinator_id' => $coordinator->id]);
            ProjectAcceptance::updateOrCreate(['project_id' => $project->id], [
                'coordinator_id' => $coordinator->id, 'assigned_by' => $request->user()->id, 'assigned_at' => now(), 'accepted_at' => null,
            ]);
        });

        $this->audit($request, $project, 'assigned coordinator', ['coordinator_id' => $coordinator->id]);
        Notify::users([$coordinator], 'New project assigned', "You are the coordinator for \"{$project->name}\". Open it in the Project Office and accept it.", 'project_assigned', $project->id, $request->user());
        Notify::users(User::whereIn('id', ProjectFinance::where('project_id', $project->id)->pluck('sales_user_id'))->get(), 'Coordinator assigned',
            "\"{$project->name}\" is assigned to " . trim("{$coordinator->first_name} {$coordinator->last_name}") . '.', 'project_assigned', $project->id, $request->user());

        return response()->json(['data' => ProjectAcceptance::where('project_id', $project->id)->first()]);
    }

    /** The assigned coordinator accepts the project; a Planning project becomes Active. */
    public function accept(Request $request, Project $project)
    {
        $acc = ProjectAcceptance::where('project_id', $project->id)->first();
        abort_unless($acc && ($acc->coordinator_id === $request->user()->id || Access::pmoManager($request->user())), 403, 'Only the assigned coordinator can accept this project.');
        if ($acc->accepted_at) {
            return response()->json(['message' => 'Already accepted.'], 422);
        }

        $acc->update(['accepted_at' => now()]);
        if ($project->status === 'Planning') {
            $project->update(['status' => 'Active']);
        }
        $this->audit($request, $project, 'accepted project', []);
        Notify::users(User::whereIn('id', ProjectFinance::where('project_id', $project->id)->pluck('sales_user_id'))->get()->merge(Access::pmoManagers()),
            'Project accepted', "\"{$project->name}\" was accepted by its coordinator.", 'project_accepted', $project->id, $request->user());

        return response()->json(['data' => $acc->fresh()]);
    }

    /**
     * Replace the department budgets. The total may not exceed the contract value unless allow_over_contract is sent,
     * in which case management is notified (the sheet's "out of budget" action).
     */
    public function setBudget(Request $request, Project $project)
    {
        $this->requireManager($request, 'pmo_budget');
        $data = $request->validate([
            'allocations' => 'required|array',
            'allocations.*.team_id' => 'required|exists:teams,id|distinct',
            'allocations.*.amount' => 'required|numeric|min:0',
            'reason' => 'nullable|string|max:2000',
        ]);

        $total = collect($data['allocations'])->sum('amount');
        // Allocations are PERSON-DAYS (8h each). Limit = the Sales max budget cap (person-days); no cap means no limit.
        // The manager has full access: going over the limit, or raising a budget that was already set, is allowed but needs a
        // written reason, which is audited and sent to the Super Admin.
        $cap = \App\Models\ProjectIntake::where('project_id', $project->id)->value('budget_cap');
        $limit = $cap !== null ? (float) $cap : null;
        $what = 'the maximum budget cap set by Sales';
        $previous = (float) ProjectBudgetAllocation::where('project_id', $project->id)->sum('amount');
        $over = $limit !== null && $total > $limit;
        $raised = $previous > 0 && $total > $previous;
        $reason = trim((string) ($data['reason'] ?? ''));
        if (($over || $raised) && $reason === '') {
            $msg = $over
                ? 'Allocated ' . number_format($total, 2) . " person-days is more than {$what} (" . number_format($limit, 2) . ' person-days). Enter the reason for the increase.'
                : 'You are raising the person-days from ' . number_format($previous, 2) . ' to ' . number_format($total, 2) . '. Enter the reason for the increase.';

            return response()->json(['message' => $msg, 'errors' => ['reason' => [$msg]], 'over_contract' => $over, 'needs_reason' => true], 422);
        }

        DB::transaction(function () use ($project, $data, $request) {
            $keep = collect($data['allocations'])->filter(fn ($a) => (float) $a['amount'] > 0);
            ProjectBudgetAllocation::where('project_id', $project->id)->whereNotIn('team_id', $keep->pluck('team_id'))->delete();
            foreach ($keep as $a) {
                ProjectBudgetAllocation::updateOrCreate(['project_id' => $project->id, 'team_id' => $a['team_id']], ['amount' => $a['amount'], 'allocated_by' => $request->user()->id]);
            }
        });

        $this->audit($request, $project, 'allocated department budget', ['total' => $total, 'previous' => $previous, 'limit' => $limit, 'reason' => $reason ?: null]);
        if ($over) {
            Notify::users(User::role('Super Admin')->get(), 'Person-days allocated over cap', "\"{$project->name}\": departments were given " . number_format($total, 2) . ' person-days against ' . $what . ' ' . number_format($limit, 2) . ". Reason: {$reason}", 'budget_over_contract', $project->id, $request->user());
        }

        return response()->json(['gate' => $this->gateFor($request, $project), 'allocations' => ProjectBudgetAllocation::with('team:id,name')->where('project_id', $project->id)->get()]);
    }

    public function hold(Request $request, Project $project)
    {
        $this->requireManager($request, 'pmo_hold');
        $data = $request->validate(['reason_code' => ['required', Rule::in(array_keys(self::HOLD_REASONS))], 'note' => 'nullable|string|max:2000']);
        if ($data['reason_code'] === 'other' && empty($data['note'])) {
            return response()->json(['message' => 'Add a note when the reason is Other.', 'errors' => ['note' => ['Add a note when the reason is Other.']]], 422);
        }

        DB::transaction(function () use ($project, $data, $request) {
            ProjectHold::where('project_id', $project->id)->whereNull('cleared_at')->update(['cleared_at' => now(), 'cleared_by' => $request->user()->id]);
            ProjectHold::create($data + ['project_id' => $project->id, 'set_by' => $request->user()->id]);
            $project->update(['status' => 'On Hold']);
        });

        $label = self::HOLD_REASONS[$data['reason_code']];
        $this->audit($request, $project, 'put project on hold', $data);
        Notify::users($this->stakeholders($project), 'Project on hold', "\"{$project->name}\" is on hold: {$label}." . (empty($data['note']) ? '' : " {$data['note']}"), 'project_on_hold', $project->id, $request->user());

        return response()->json(['data' => $project->only(['id', 'name', 'status'])]);
    }

    public function resume(Request $request, Project $project)
    {
        $this->requireManager($request, 'pmo_hold');
        ProjectHold::where('project_id', $project->id)->whereNull('cleared_at')->update(['cleared_at' => now(), 'cleared_by' => $request->user()->id]);
        $project->update(['status' => 'Active']);
        $this->audit($request, $project, 'resumed project', []);
        Notify::users($this->stakeholders($project), 'Project resumed', "\"{$project->name}\" is active again.", 'project_resumed', $project->id, $request->user());

        return response()->json(['data' => $project->only(['id', 'name', 'status'])]);
    }

    /** Open a locked tab anyway. Payment override: Super Admin only. Budget override: PMO manager. */
    public function override(Request $request, Project $project)
    {
        $data = $request->validate(['type' => ['required', Rule::in(['payment', 'budget'])], 'reason' => 'required|string|max:2000']);
        if ($data['type'] === 'payment') {
            abort_unless($request->user()->hasRole('Super Admin'), 403, 'Only the Super Admin can override the payment lock.');
        } else {
            $this->requireManager($request, 'pmo_override');
        }

        ProjectOverride::updateOrCreate(['project_id' => $project->id, 'type' => $data['type']], ['reason' => $data['reason'], 'by_user_id' => $request->user()->id]);
        $this->audit($request, $project, "overrode {$data['type']} lock", ['reason' => $data['reason']]);

        return response()->json(['gate' => $this->gateFor($request, $project)]);
    }

    public function removeOverride(Request $request, Project $project, string $type)
    {
        abort_unless(in_array($type, ['payment', 'budget'], true), 404);
        abort_unless($type === 'payment' ? $request->user()->hasRole('Super Admin') : Access::can('pmo_override', $request->user()), 403, 'Not allowed.');
        ProjectOverride::where('project_id', $project->id)->where('type', $type)->delete();
        $this->audit($request, $project, "removed {$type} override", []);

        return response()->json(['gate' => $this->gateFor($request, $project)]);
    }

    // ---- shared helpers (also used by PmoWorkController) -------------------------

    public static function canView(User $user, Project $project): bool
    {
        return Access::pmoManager($user) || $project->project_coordinator_id === $user->id;
    }

    private function authorizeView(Request $request, Project $project): void
    {
        abort_unless(self::canView($request->user(), $project), 403, 'This project is not assigned to you.');
    }

    /** Gate state with the money figures removed for anyone who may not see project cost. */
    private function gateFor(Request $request, Project $project): array
    {
        $gate = ProjectGate::state($project);
        if (! Access::seesProjectCost($request->user())) {
            $gate['payment'] = array_merge($gate['payment'], ['contract_value' => null, 'received' => null, 'balance' => null]);
        }

        return $gate;
    }

    private function requireManager(Request $request, string $power = 'pmo_manager'): void
    {
        abort_unless(Access::can($power, $request->user()), 403, 'Only the project manager can do this.');
    }

    /** Sales person, coordinator, Accounts team and PMO managers for a project. */
    private function stakeholders(Project $project)
    {
        return User::whereIn('id', ProjectFinance::where('project_id', $project->id)->pluck('sales_user_id')->push($project->project_coordinator_id)->filter())->get()
            ->merge(Access::teamMembers(['accounts']))->merge(Access::pmoManagers());
    }

    private function audit(Request $request, $model, string $action, array $changes): void
    {
        AuditLog::create([
            'user_id' => $request->user()->id, 'action' => $action, 'model_type' => get_class($model),
            'model_id' => $model->id, 'changes' => json_encode($changes), 'ip_address' => $request->ip(),
        ]);
    }
}
