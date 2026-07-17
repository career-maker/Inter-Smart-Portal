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
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->hasRole('Super Admin')) {
            // Return all active employees with their balances (or zeros if no balance record exists)
            $employees = User::where('status', 'Active')
                ->whereDoesntHave('roles', fn($q) => $q->where('name', 'Super Admin'))
                ->with('leaveBalance')
                ->get(['id', 'first_name', 'last_name', 'employee_code', 'designation', 'team_id'])
                ->map(function ($emp) {
                    $balance = $emp->leaveBalance;
                    // Calculate total_leaves_taken from approved leave requests
                    try {
                        $casualTaken = (float)(LeaveRequest::where('user_id', $emp->id)
                            ->where('status', 'Approved')
                            ->whereHas('leaveType', fn($q) => $q->where('name', 'Casual Leave'))
                            ->sum(DB::raw('COALESCE(days, 0)')) ?? 0);
                            
                        $sickTaken = (float)(LeaveRequest::where('user_id', $emp->id)
                            ->where('status', 'Approved')
                            ->whereHas('leaveType', fn($q) => $q->where('name', 'Sick Leave'))
                            ->sum(DB::raw('COALESCE(days, 0)')) ?? 0);

                        $totalTaken = (float)(LeaveRequest::where('user_id', $emp->id)
                            ->where('status', 'Approved')
                            ->sum(DB::raw('COALESCE(days, 0)')) ?? 0);
                    } catch (\Exception $e) {
                        \Log::warning("Failed to sum leaves for user {$emp->id}: " . $e->getMessage());
                        $casualTaken = 0;
                        $sickTaken = 0;
                        $totalTaken = 0;
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

        // Calculate total_leaves_taken from approved leave requests instead of stored value
        try {
            $casualTaken = (float)(LeaveRequest::where('user_id', $user->id)
                ->where('status', 'Approved')
                ->whereHas('leaveType', fn($q) => $q->where('name', 'Casual Leave'))
                ->sum(DB::raw('COALESCE(days, 0)')) ?? 0);
                
            $sickTaken = (float)(LeaveRequest::where('user_id', $user->id)
                ->where('status', 'Approved')
                ->whereHas('leaveType', fn($q) => $q->where('name', 'Sick Leave'))
                ->sum(DB::raw('COALESCE(days, 0)')) ?? 0);

            $totalTaken = (float)(LeaveRequest::where('user_id', $user->id)
                ->where('status', 'Approved')
                ->sum(DB::raw('COALESCE(days, 0)')) ?? 0);
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
            'sick_leave_balance'    => 'sometimes|numeric|min:0|max:365',
            'remarks'               => 'nullable|string|max:500',
        ]);

        $employee = User::findOrFail($userId);

        $balance = LeaveBalance::firstOrCreate(
            ['user_id' => $userId],
            ['casual_leave_balance' => 0, 'sick_leave_balance' => 0, 'cl_carry_forward' => 0]
        );

        DB::transaction(function () use ($request, $admin, $employee, $balance) {
            // Casual Leave adjustment
            if ($request->has('casual_leave_balance')) {
                $oldCL = $balance->casual_leave_balance;
                $newCL = (float) $request->casual_leave_balance;

                LeaveBalanceAuditLog::create([
                    'user_id'          => $employee->id,
                    'leave_type'       => 'Casual Leave',
                    'previous_balance' => $oldCL,
                    'new_balance'      => $newCL,
                    'modified_by'      => $admin->id,
                    'remarks'          => $request->remarks,
                ]);

                $balance->casual_leave_balance = $newCL;
            }

            // CL Carry-Forward adjustment
            if ($request->has('cl_carry_forward')) {
                $oldCF = $balance->cl_carry_forward;
                $newCF = (float) $request->cl_carry_forward;

                LeaveBalanceAuditLog::create([
                    'user_id'          => $employee->id,
                    'leave_type'       => 'CL Carry Forward',
                    'previous_balance' => $oldCF,
                    'new_balance'      => $newCF,
                    'modified_by'      => $admin->id,
                    'remarks'          => $request->remarks,
                ]);

                $balance->cl_carry_forward = $newCF;
            }

            // Sick Leave adjustment
            if ($request->has('sick_leave_balance')) {
                $oldSL = $balance->sick_leave_balance;
                $newSL = (float) $request->sick_leave_balance;

                LeaveBalanceAuditLog::create([
                    'user_id'          => $employee->id,
                    'leave_type'       => 'Sick Leave',
                    'previous_balance' => $oldSL,
                    'new_balance'      => $newSL,
                    'modified_by'      => $admin->id,
                    'remarks'          => $request->remarks,
                ]);

                $balance->sick_leave_balance = $newSL;
            }

            $balance->save();
        });

        return response()->json([
            'message' => 'Leave balance updated successfully.',
            'data'    => $balance->fresh(),
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
