<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\LeaveBalance;
use App\Models\LeavePolicySetting;
use App\Models\EmployeeLeavePolicy;
use App\Models\LeaveAllocationLedger;
use App\Services\LeavePolicyEngine;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class LeavePolicyController extends Controller
{
    protected LeavePolicyEngine $engine;

    public function __construct(LeavePolicyEngine $engine)
    {
        $this->engine = $engine;
    }

    /**
     * GET /api/leave-policy/settings
     */
    public function getSettings(): JsonResponse
    {
        $settings  = $this->engine->getSettings();
        $cycleInfo = $this->engine->getCycleInfo();

        return response()->json([
            'status'     => 'success',
            'settings'   => $settings,
            'cycle_info' => $cycleInfo,
        ]);
    }

    /**
     * POST /api/leave-policy/settings
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $admin = $request->user();
        if (!$admin->hasRole('Super Admin')) {
            return response()->json(['message' => 'Forbidden: Super Admin only.'], 403);
        }

        $validated = $request->validate([
            'monthly_cycle_start_day'      => 'required|integer|min:1|max:28',
            'probation_period_months'      => 'required|integer|min:1|max:36',
            'default_monthly_cl'           => 'required|numeric|min:0|max:10',
            'default_monthly_sl'           => 'required|numeric|min:0|max:10',
            'cl_carry_forward_years'       => 'required|integer|min:1|max:5',
            'sl_carry_forward_allowed'     => 'required|boolean',
            'cl_advance_notice_days'       => 'nullable|integer|min:0|max:30',
            'wfh_morning_cutoff_time'      => 'nullable|string|max:10',
            'wfh_afternoon_cutoff_time'    => 'nullable|string|max:10',
            'late_threshold_time'          => 'nullable|string|max:10',
            'single_day_approval_level'    => 'nullable|string|in:tl_only,tl_and_admin,admin_only',
            'multi_day_approval_threshold' => 'nullable|integer|min:1|max:30',
            'lop_admin_approval_required'  => 'nullable|boolean',
        ]);

        $settings = LeavePolicySetting::current();
        $settings->update($validated);

        // Immediately evaluate and process current monthly cycle allocation under new settings
        try {
            $this->engine->processMonthlyCycleAllocation(now('Asia/Kolkata'), false);
        } catch (\Throwable $e) {
            \Log::warning("Immediate monthly cycle allocation failed on updateSettings: " . $e->getMessage());
        }

        return response()->json([
            'status'     => 'success',
            'message'    => 'Leave policy settings and rules updated successfully.',
            'settings'   => $settings->fresh(),
            'cycle_info' => $this->engine->getCycleInfo(),
        ]);
    }

    /**
     * GET /api/leave-policy/employees
     */
    public function getEmployees(Request $request): JsonResponse
    {
        // Self-healing: ensure active cycle allocation has run for all eligible employees
        try {
            $this->engine->processMonthlyCycleAllocation();
        } catch (\Throwable $e) {
            \Log::warning("Self-healing monthly allocation check failed in getEmployees: " . $e->getMessage());
        }

        $search = $request->input('search');
        $statusFilter = $request->input('status'); // 'all', 'in_probation', 'completed', 'cleared_manually', 'custom_allocation'

        $query = User::where('status', 'Active')
            ->when(\Illuminate\Support\Facades\Schema::hasColumn('users', 'role'), function ($q) {
                $q->where(function ($sub) {
                    $sub->whereNull('role')
                        ->orWhereRaw('LOWER(role) != ?', ['super admin']);
                });
            })
            ->whereDoesntHave('roles', fn($q) => $q->where('name', 'Super Admin'))
            ->with(['leaveBalance', 'employeeLeavePolicy']);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('employee_code', 'like', "%{$search}%");
            });
        }

        $employees = $query->orderBy('first_name')->get()->map(function ($emp) {
            $eligibility = $this->engine->isEmployeeEligibleForAutoAllocation($emp);
            $policy = $emp->employeeLeavePolicy;
            $balance = $emp->leaveBalance;
            $settings = $this->engine->getSettings();

            $effectiveCL = $policy?->custom_monthly_cl !== null 
                ? (float) $policy->custom_monthly_cl 
                : (float) $settings->default_monthly_cl;

            $effectiveSL = $policy?->custom_monthly_sl !== null 
                ? (float) $policy->custom_monthly_sl 
                : (float) $settings->default_monthly_sl;

            return [
                'id'                         => $emp->id,
                'name'                       => trim($emp->first_name . ' ' . $emp->last_name),
                'email'                      => $emp->email,
                'employee_code'              => $emp->employee_code ?? '—',
                'designation'                => $emp->designation ?? '—',
                'joining_date'               => $emp->joining_date,
                'probation_end_date'         => $emp->probationEndDate(),
                'is_in_probation'            => $emp->isInProbation(),
                'probation_cleared_manually' => (bool) ($policy?->probation_cleared_manually || $balance?->probation_cleared_manually),
                'eligibility_status'         => $eligibility['status'],
                'eligibility_reason'         => $eligibility['reason'],
                'days_remaining'             => $eligibility['days_remaining'] ?? 0,
                'casual_leave_balance'       => (float) ($balance?->casual_leave_balance ?? 0),
                'cl_carry_forward'           => (float) ($balance?->cl_carry_forward ?? 0),
                'sick_leave_balance'         => (float) ($balance?->sick_leave_balance ?? 0),
                'last_allocated_cycle'       => $balance?->last_allocated_cycle,
                'custom_monthly_cl'          => $policy?->custom_monthly_cl,
                'custom_monthly_sl'          => $policy?->custom_monthly_sl,
                'custom_probation_months'    => $policy?->custom_probation_months,
                'effective_monthly_cl'       => $effectiveCL,
                'effective_monthly_sl'       => $effectiveSL,
                'has_custom_allocation'      => $policy && ($policy->custom_monthly_cl !== null || $policy->custom_monthly_sl !== null),
            ];
        });

        // Optional post-filter
        if ($statusFilter && $statusFilter !== 'all') {
            $employees = $employees->filter(function ($emp) use ($statusFilter) {
                if ($statusFilter === 'in_probation') return $emp['is_in_probation'];
                if ($statusFilter === 'completed') return !$emp['is_in_probation'] && !$emp['probation_cleared_manually'];
                if ($statusFilter === 'cleared_manually') return $emp['probation_cleared_manually'];
                if ($statusFilter === 'custom_allocation') return $emp['has_custom_allocation'];
                return true;
            })->values();
        }

        return response()->json([
            'status'    => 'success',
            'employees' => $employees,
            'count'     => $employees->count(),
        ]);
    }

    /**
     * POST /api/leave-policy/employees/{userId}
     * Configure employee-specific allocation or probation overrides.
     */
    public function updateEmployeePolicy(Request $request, int $userId): JsonResponse
    {
        $admin = $request->user();
        if (!$admin->hasRole('Super Admin')) {
            return response()->json(['message' => 'Forbidden: Super Admin only.'], 403);
        }

        $employee = User::findOrFail($userId);

        $validated = $request->validate([
            'custom_monthly_cl'          => 'nullable|numeric|min:0|max:10',
            'custom_monthly_sl'          => 'nullable|numeric|min:0|max:10',
            'custom_probation_months'    => 'nullable|integer|min:1|max:36',
            'probation_cleared_manually' => 'nullable|boolean',
            'notes'                      => 'nullable|string|max:500',
        ]);

        $policy = EmployeeLeavePolicy::firstOrCreate(['user_id' => $employee->id]);
        
        $policy->custom_monthly_cl       = $request->filled('custom_monthly_cl') ? (float) $request->custom_monthly_cl : null;
        $policy->custom_monthly_sl       = $request->filled('custom_monthly_sl') ? (float) $request->custom_monthly_sl : null;
        $policy->custom_probation_months = $request->filled('custom_probation_months') ? (int) $request->custom_probation_months : null;
        
        if ($request->has('probation_cleared_manually')) {
            $isCleared = (bool) $request->probation_cleared_manually;
            $policy->probation_cleared_manually = $isCleared;
            if ($isCleared && !$policy->probation_cleared_at) {
                $policy->probation_cleared_at = now();
                $policy->probation_cleared_by = $admin->id;
            }
        }
        
        if ($request->has('notes')) {
            $policy->notes = $request->notes;
        }

        $policy->save();

        // Ensure employee is allocated or topped up for the active cycle immediately
        try {
            $this->engine->ensureEmployeeAllocatedForCurrentCycle($employee);
        } catch (\Throwable $e) {
            \Log::warning("Failed to allocate leaves on employee policy update for user {$employee->id}: " . $e->getMessage());
        }

        return response()->json([
            'status'  => 'success',
            'message' => "Policy override updated for {$employee->first_name} {$employee->last_name}.",
            'policy'  => $policy->fresh(),
        ]);
    }

    /**
     * POST /api/leave-policy/employees/{userId}/clear-probation
     */
    public function clearEmployeeProbation(Request $request, int $userId): JsonResponse
    {
        $admin = $request->user();
        if (!$admin->hasRole('Super Admin')) {
            return response()->json(['message' => 'Forbidden: Super Admin only.'], 403);
        }

        $employee = User::findOrFail($userId);
        $policy = EmployeeLeavePolicy::firstOrCreate(['user_id' => $employee->id]);

        $policy->probation_cleared_manually = true;
        $policy->probation_cleared_at       = now();
        $policy->probation_cleared_by       = $admin->id;
        $policy->notes = ($policy->notes ? $policy->notes . "\n" : "") .
            "[" . now()->toDateString() . "] Probation explicitly cleared by " . trim($admin->first_name . ' ' . $admin->last_name);
        $policy->save();

        // Also update leave balance flag
        LeaveBalance::where('user_id', $employee->id)->update(['probation_cleared_manually' => true]);

        // Record in ledger
        $cycleInfo = $this->engine->getCycleInfo();
        LeaveAllocationLedger::create([
            'user_id'          => $employee->id,
            'leave_type'       => 'Probation Clearance',
            'amount'           => 0,
            'transaction_type' => 'probation_clearance',
            'cycle_key'        => $cycleInfo['cycle_key'],
            'opening_balance'  => 0,
            'closing_balance'  => 0,
            'modified_by'      => $admin->id,
            'remarks'          => "Probation manually cleared by {$admin->first_name} {$admin->last_name}.",
        ]);

        // Immediately allocate active cycle leaves for this employee now that probation is cleared
        try {
            $this->engine->ensureEmployeeAllocatedForCurrentCycle($employee);
        } catch (\Throwable $e) {
            \Log::warning("Failed to allocate leaves on probation clearance for user {$employee->id}: " . $e->getMessage());
        }

        return response()->json([
            'status'  => 'success',
            'message' => "Probation cleared for {$employee->first_name} {$employee->last_name}. Active cycle leaves allocated.",
        ]);
    }

    /**
     * POST /api/leave-policy/adjust-balance/{userId}
     */
    public function adjustEmployeeBalance(Request $request, int $userId): JsonResponse
    {
        $admin = $request->user();
        if (!$admin->hasRole('Super Admin')) {
            return response()->json(['message' => 'Forbidden: Super Admin only.'], 403);
        }

        $request->validate([
            'casual_leave_balance'  => 'sometimes|numeric|min:0|max:365',
            'cl_carry_forward'      => 'sometimes|numeric|min:0|max:365',
            'cl_carry_forward_year' => 'nullable|integer|min:2020|max:2050',
            'sick_leave_balance'    => 'sometimes|numeric|min:0|max:365',
            'remarks'               => 'nullable|string|max:500',
        ]);

        $employee = User::findOrFail($userId);
        $balance = $this->engine->recordManualAdjustment($admin, $employee, $request->all(), $request->input('remarks'));

        return response()->json([
            'status'  => 'success',
            'message' => "Leave balance updated successfully for {$employee->first_name} {$employee->last_name}.",
            'data'    => $balance,
        ]);
    }

    /**
     * GET /api/leave-policy/ledger
     * Paginated audit ledger.
     */
    public function getLedger(Request $request): JsonResponse
    {
        $userId          = $request->input('user_id');
        $transactionType = $request->input('transaction_type');
        $leaveType       = $request->input('leave_type');
        $dateFrom        = $request->input('from_date');
        $dateTo          = $request->input('to_date');
        $search          = $request->input('search');

        $query = LeaveAllocationLedger::with([
            'user:id,first_name,last_name,employee_code,email',
            'modifier:id,first_name,last_name',
        ])->orderByDesc('created_at');

        if ($userId) {
            $query->where('user_id', $userId);
        }

        if ($transactionType) {
            $query->where('transaction_type', $transactionType);
        }

        if ($leaveType) {
            $query->where('leave_type', $leaveType);
        }

        if ($dateFrom) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        if ($search) {
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('employee_code', 'like', "%{$search}%");
            });
        }

        $ledger = $query->paginate($request->input('per_page', 20));

        return response()->json([
            'status' => 'success',
            'data'   => $ledger,
        ]);
    }

    /**
     * POST /api/leave-policy/trigger-cycle
     * Trigger or simulate monthly allocation cycle.
     */
    public function triggerCycle(Request $request): JsonResponse
    {
        $admin = $request->user();
        if (!$admin->hasRole('Super Admin')) {
            return response()->json(['message' => 'Forbidden: Super Admin only.'], 403);
        }

        $force = (bool) $request->input('force', false);
        $dateStr = $request->input('date');
        $asOfDate = $dateStr ? Carbon::parse($dateStr, 'Asia/Kolkata') : Carbon::now('Asia/Kolkata');

        $result = $this->engine->processMonthlyCycleAllocation($asOfDate, $force);

        return response()->json([
            'status'  => 'success',
            'message' => "Leave policy monthly cycle execution completed.",
            'result'  => $result,
        ]);
    }
}
