<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveBalance;
use App\Models\LeaveBalanceAuditLog;
use App\Models\LeaveRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LeaveBalanceController extends Controller
{
    /**
     * GET /leave-balances
     * Employee: own balance.
     * Super Admin: all employees' balances.
     * Note: Super Admin is filtered out; only Active employees (non-admin) are shown
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->hasRole('Super Admin')) {
            // Return all active employees with their balances (or zeros if no balance record exists)
            $employees = User::where('status', 'Active')
                ->whereDoesntHave('roles', fn($q) => $q->where('name', 'Super Admin'))
                ->with(['leaveBalance', 'leaveRequests' => function ($q) {
                    $q->where('status', 'Approved')->with('leaveType');
                }])
                ->get()
                ->map(function ($emp) {
                    $balance = $emp->leaveBalance;

                    $casualTaken = 0;
                    $sickTaken = 0;
                    $totalTaken = 0;

                    if ($emp->relationLoaded('leaveRequests')) {
                        $casualTaken = (float) $emp->leaveRequests->filter(function ($l) {
                            return str_contains(strtolower($l->leaveType->name ?? ''), 'casual');
                        })->sum('days_taken');

                        $sickTaken = (float) $emp->leaveRequests->filter(function ($l) {
                            return str_contains(strtolower($l->leaveType->name ?? ''), 'sick');
                        })->sum('days_taken');

                        $totalTaken = (float) $emp->leaveRequests->sum('days_taken');
                    }

                    return [
                        'user_id'               => $emp->id,
                        'name'                  => trim($emp->first_name . ' ' . $emp->last_name),
                        'employee_code'         => $emp->employee_code ?? '—',
                        'designation'           => $emp->designation ?? '—',
                        'casual_leave_balance'  => max(0, (float)(optional($balance)->casual_leave_balance ?? 0)),
                        'cl_carry_forward'      => max(0, (float)(data_get($balance, 'cl_carry_forward', 0))),
                        'cl_carry_forward_year' => $balance ? data_get($balance, 'cl_carry_forward_year') : null,
                        'sick_leave_balance'    => max(0, (float)(optional($balance)->sick_leave_balance ?? 0)),
                        'casual_leaves_taken'   => max(0, $casualTaken),
                        'sick_leaves_taken'     => max(0, $sickTaken),
                        'total_leaves_taken'    => max(0, $totalTaken),
                    ];
                });

            return response()->json(['data' => $employees]);
        }

        // Regular employee – own balance only
        $balance = LeaveBalance::where('user_id', $user->id)->first();

        // Calculate total_leaves_taken from approved leave requests
        try {
            $user->load(['leaveRequests' => function ($q) {
                $q->where('status', 'Approved')->with('leaveType');
            }]);

            $casualTaken = (float) $user->leaveRequests->filter(function ($l) {
                return str_contains(strtolower($l->leaveType->name ?? ''), 'casual');
            })->sum('days_taken');

            $sickTaken = (float) $user->leaveRequests->filter(function ($l) {
                return str_contains(strtolower($l->leaveType->name ?? ''), 'sick');
            })->sum('days_taken');

            $totalTaken = (float) $user->leaveRequests->sum('days_taken');
        } catch (\Exception $e) {
            \Log::warning("Failed to sum leaves for user {$user->id}: " . $e->getMessage());
            $casualTaken = 0;
            $sickTaken = 0;
            $totalTaken = 0;
        }

        // Return balance with calculated total_leaves_taken
        $data = $balance ? $balance->toArray() : [
            'user_id' => $user->id,
            'casual_leave_balance' => 0,
            'cl_carry_forward' => 0,
            'sick_leave_balance' => 0,
        ];

        // Clamp all balances to 0 to prevent negative values
        $data['casual_leave_balance'] = max(0, (float)($data['casual_leave_balance'] ?? 0));
        $data['cl_carry_forward'] = max(0, (float)($data['cl_carry_forward'] ?? 0));
        $data['sick_leave_balance'] = max(0, (float)($data['sick_leave_balance'] ?? 0));
        $data['casual_leaves_taken'] = max(0, $casualTaken);
        $data['sick_leaves_taken'] = max(0, $sickTaken);
        $data['total_leaves_taken'] = max(0, $totalTaken);

        // Fetch monthly refill rates (default 1 or employee custom override)
        $policy = \App\Models\EmployeeLeavePolicy::where('user_id', $user->id)->first();
        $globalSettings = \App\Models\LeavePolicySetting::getSettings();
        $defaultCL = (float)($globalSettings->monthly_casual_leaves ?? 1.0);
        $defaultSL = (float)($globalSettings->monthly_sick_leaves ?? 1.0);

        $data['monthly_casual_leaves'] = $policy && $policy->custom_monthly_cl !== null
            ? (float)$policy->custom_monthly_cl
            : $defaultCL;
        $data['monthly_sick_leaves'] = $policy && $policy->custom_monthly_sl !== null
            ? (float)$policy->custom_monthly_sl
            : $defaultSL;

        return response()->json(['data' => $data]);
    }

    /**
     * POST /leave-balances/{userId}
     * Super Admin only – manually adjust an employee's balance.
     */
    public function adjust(Request $request, int $userId)
    {
        $admin = $request->user();

        if (!$admin->hasRole('Super Admin')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'casual_leave_balance'  => 'sometimes|numeric|min:0|max:365',
            'cl_carry_forward'      => 'sometimes|numeric|min:0|max:365',
            'cl_carry_forward_year' => 'nullable|integer|min:2020|max:2050',
            'sick_leave_balance'    => 'sometimes|numeric|min:0|max:365',
            'remarks'               => 'nullable|string|max:500',
        ]);

        $employee = User::findOrFail($userId);

        $engine = app(\App\Services\LeavePolicyEngine::class);
        $balance = $engine->recordManualAdjustment($admin, $employee, $request->all(), $request->remarks);

        return response()->json([
            'message' => 'Leave balance updated successfully.',
            'data'    => $balance,
        ]);
    }

    /**
     * GET /leave-balances/debug
     * Super Admin only – diagnostic info for troubleshooting.
     */
    public function debug(Request $request)
    {
        $admin = $request->user();

        if (!$admin->hasRole('Super Admin')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $totalUsers = User::count();
        $activeNonAdmins = User::where('status', 'Active')
            ->whereDoesntHave('roles', fn($q) => $q->where('name', 'Super Admin'))
            ->count();
        $usersByStatus = User::select('status', DB::raw('count(*) as count'))
            ->whereDoesntHave('roles', fn($q) => $q->where('name', 'Super Admin'))
            ->groupBy('status')
            ->get()
            ->pluck('count', 'status');

        return response()->json([
            'total_users' => $totalUsers,
            'active_non_admin_employees' => $activeNonAdmins,
            'users_by_status' => $usersByStatus,
            'message' => $activeNonAdmins === 0
                ? 'No Active employees found. Create employees in the system first.'
                : 'Employees found but may not be displaying. Check API response.'
        ]);
    }

    /**
     * GET /leave-balances/audit-logs
     * Super Admin only – view all audit logs.
     */
    public function auditLogs(Request $request)
    {
        $admin = $request->user();

        if (!$admin->hasRole('Super Admin')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $logs = LeaveBalanceAuditLog::with([
            'user:id,first_name,last_name,employee_code',
            'modifier:id,first_name,last_name',
        ])
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json(['data' => $logs]);
    }
}
