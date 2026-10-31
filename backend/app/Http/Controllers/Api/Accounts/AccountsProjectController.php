<?php

namespace App\Http\Controllers\Api\Accounts;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Project;
use App\Models\ProjectBudgetChange;
use App\Models\ProjectFinance;
use App\Models\ProjectPayment;
use App\Models\User;
use App\Notifications\AccountsNotification;
use App\Support\Access;
use App\Support\ProjectPaymentState;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Accounts view of projects: payment state, finance record, payments, budget increase, hold/terminate. */
class AccountsProjectController extends Controller
{
    /** Project list with payment state. Filters: payment_state, status, search. */
    public function index(Request $request)
    {
        $query = Project::query()->select(['id', 'name', 'status', 'project_coordinator_id', 'start_date', 'expected_end_date']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $projects = $query->orderByDesc('id')->get();
        $finance = ProjectFinance::whereIn('project_id', $projects->pluck('id'))->get()->keyBy('project_id');
        $payments = ProjectPayment::whereIn('project_id', $projects->pluck('id'))->get()->groupBy('project_id');

        $rows = $projects->map(function ($p) use ($finance, $payments) {
            $mine = $payments->get($p->id, collect());

            return array_merge($p->only(['id', 'name', 'status', 'start_date', 'expected_end_date']), [
                'sales_user_id' => $finance->get($p->id)?->sales_user_id,
                'awaiting_payments' => $mine->where('status', 'Awaiting')->count(),
            ], ProjectPaymentState::for($finance->get($p->id), $mine));
        });

        if ($request->filled('payment_state')) {
            $rows = $rows->where('state', $request->payment_state);
        }

        return response()->json(['data' => $rows->values()]);
    }

    public function show(Project $project)
    {
        $finance = ProjectFinance::where('project_id', $project->id)->first();
        $payments = ProjectPayment::where('project_id', $project->id)->orderByDesc('id')->get();

        return response()->json([
            'project' => $project->only(['id', 'name', 'status']),
            'finance' => $finance,
            'payments' => $payments,
            'budget_changes' => ProjectBudgetChange::where('project_id', $project->id)->orderByDesc('id')->get(),
        ] + ['summary' => ProjectPaymentState::for($finance, $payments)]);
    }

    public function saveFinance(Request $request, Project $project)
    {
        $data = $request->validate([
            'contract_value' => 'required|numeric|min:0',
            'sales_user_id' => 'nullable|exists:users,id',
            'notes' => 'nullable|string|max:2000',
        ]);

        $finance = ProjectFinance::firstOrNew(['project_id' => $project->id]);
        $finance->fill($data);
        $finance->created_by ??= $request->user()->id;
        $finance->save();

        return response()->json(['data' => $finance]);
    }

    public function requestPayment(Request $request, Project $project)
    {
        $data = $request->validate([
            'kind' => 'required|in:advance,installment,final,po,override', // po = purchase order received; override = Accounts lets the project start with no payment yet
            'amount' => 'nullable|numeric|min:0',
            'due_date' => 'nullable|date',
            'reference' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:2000',
        ]);

        if (! in_array($data['kind'], ['po', 'override'], true) && (float) ($data['amount'] ?? 0) <= 0) {
            return response()->json(['message' => 'Enter the amount.', 'errors' => ['amount' => ['Enter the amount.']]], 422);
        }
        $data['amount'] = $data['amount'] ?? 0;
        $payment = ProjectPayment::create($data + ['project_id' => $project->id, 'requested_by' => $request->user()->id]);

        return response()->json(['data' => $payment], 201);
    }

    public function approvePayment(Request $request, ProjectPayment $payment)
    {
        return $this->decide($request, $payment, 'Approved');
    }

    public function rejectPayment(Request $request, ProjectPayment $payment)
    {
        $request->validate(['reason' => 'required|string|max:2000']);

        return $this->decide($request, $payment, 'Rejected', $request->reason);
    }

    private function decide(Request $request, ProjectPayment $payment, string $status, ?string $reason = null)
    {
        if ($payment->status !== 'Awaiting') {
            return response()->json(['message' => "Payment is already {$payment->status}."], 422);
        }

        $payment->update([
            'status' => $status,
            'decided_by' => $request->user()->id,
            'decided_at' => now(),
            'notes' => $reason ? trim($payment->notes . "\nRejected: " . $reason) : $payment->notes,
        ]);

        $project = $payment->project;
        $finance = ProjectFinance::where('project_id', $project->id)->first();
        $amount = number_format((float) $payment->amount, 2);
        $this->audit($request, $payment, strtolower($status) . ' payment', ['amount' => $payment->amount, 'kind' => $payment->kind]);

        if ($status === 'Approved') {
            $label = match ($payment->kind) { 'advance' => 'Advance payment approved', 'po' => 'Purchase order received', 'override' => 'Accounts approved the start', default => 'Payment approved' };
            // No amount here: the Project Office must not see project cost.
            $this->notify($this->recipients($project, $finance, includePmo: true),
                $label, "{$label} for \"{$project->name}\". You can proceed.", 'payment_approved', $project->id, $request->user());
        }

        return response()->json(['data' => $payment->fresh()]);
    }

    public function increaseBudget(Request $request, Project $project)
    {
        $data = $request->validate(['new_value' => 'required|numeric|min:0', 'reason' => 'required|string|max:2000']);

        $finance = ProjectFinance::firstOrNew(['project_id' => $project->id]);
        $old = (float) ($finance->contract_value ?? 0);
        if ((float) $data['new_value'] <= $old) {
            return response()->json(['message' => 'New budget must be higher than the current budget.'], 422);
        }

        DB::transaction(function () use ($finance, $project, $data, $old, $request) {
            $finance->project_id = $project->id;
            $finance->contract_value = $data['new_value'];
            $finance->created_by ??= $request->user()->id;
            $finance->save();
            ProjectBudgetChange::create([
                'project_id' => $project->id, 'old_value' => $old, 'new_value' => $data['new_value'],
                'reason' => $data['reason'], 'changed_by' => $request->user()->id,
            ]);
        });

        $this->audit($request, $project, 'increased budget', ['old' => $old, 'new' => $data['new_value']]);
        // Sheet: budget increases are notified to management and HR.
        $management = $this->usersWithRoles(['Super Admin', 'HR']);
        $this->notify($management->merge($this->recipients($project, $finance, includePmo: true)),
            'Budget increased', "Budget for \"{$project->name}\" raised from " . number_format($old, 2) . ' to ' . number_format((float) $data['new_value'], 2) . ". Reason: {$data['reason']}",
            'budget_increased', $project->id, $request->user());

        return response()->json(['data' => $finance->fresh()]);
    }

    /** Hold, terminate (Cancelled) or resume (Active) a project. */
    public function setStatus(Request $request, Project $project)
    {
        $data = $request->validate(['status' => 'required|in:On Hold,Cancelled,Active', 'reason' => 'required|string|max:2000']);

        $old = $project->status;
        $project->update(['status' => $data['status']]);
        $this->audit($request, $project, 'changed project status', ['from' => $old, 'to' => $data['status'], 'reason' => $data['reason']]);

        $finance = ProjectFinance::where('project_id', $project->id)->first();
        $this->notify($this->recipients($project, $finance, includePmo: true),
            'Project status changed', "\"{$project->name}\" moved from {$old} to {$data['status']} by Accounts. Reason: {$data['reason']}",
            'project_status_changed', $project->id, $request->user());

        return response()->json(['data' => $project->only(['id', 'name', 'status'])]);
    }

    /** Sales person on the finance record, project coordinator, and (optionally) users with the PMO role. */
    private function recipients(Project $project, ?ProjectFinance $finance, bool $includePmo)
    {
        $ids = collect([$finance?->sales_user_id, $project->project_coordinator_id])->filter();
        $users = User::whereIn('id', $ids)->get();

        return $includePmo ? $users->merge($this->usersWithRoles(['PMO']))->merge(Access::teamMembers(['pmo'])) : $users;
    }

    /** Safe when a role does not exist yet (PMO arrives in a later phase). */
    private function usersWithRoles(array $names)
    {
        return User::whereHas('roles', fn ($q) => $q->whereIn('name', $names))->get();
    }

    private function notify($users, string $title, string $message, string $event, int $projectId, User $actor): void
    {
        foreach ($users->unique('id')->reject(fn ($u) => $u->id === $actor->id) as $user) {
            try {
                $user->notify(new AccountsNotification($title, $message, $event, $projectId));
            } catch (\Throwable $e) {
                \Log::warning('AccountsNotification failed: ' . $e->getMessage());
            }
        }
    }

    private function audit(Request $request, $model, string $action, array $changes): void
    {
        AuditLog::create([
            'user_id' => $request->user()->id, 'action' => $action, 'model_type' => get_class($model),
            'model_id' => $model->id, 'changes' => json_encode($changes), 'ip_address' => $request->ip(),
        ]);
    }
}
