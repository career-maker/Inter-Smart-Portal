<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveBalance;
use App\Models\LeaveBalanceAuditLog;
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
                    return [
                        'user_id'               => $emp->id,
                        'name'                  => trim($emp->first_name . ' ' . $emp->last_name),
                        'employee_code'         => $emp->employee_code ?? '—',
                        'designation'           => $emp->designation ?? '—',
                        'casual_leave_balance'  => $balance ? (float)($balance->casual_leave_balance ?? 0) : 0,
                        'cl_carry_forward'      => $balance ? (float)(data_get($balance, 'cl_carry_forward', 0)) : 0,
                        'cl_carry_forward_year' => $balance ? data_get($balance, 'cl_carry_forward_year') : null,
                        'sick_leave_balance'    => $balance ? (float)($balance->sick_leave_balance ?? 0) : 0,
                        'total_leaves_taken'    => $balance ? (float)($balance->total_leaves_taken ?? 0) : 0,
                    ];
                });

            return response()->json(['data' => $employees]);
        }

        // Regular employee – own balance only
        $balance = LeaveBalance::where('user_id', $user->id)->first();

        return response()->json(['data' => $balance]);
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
