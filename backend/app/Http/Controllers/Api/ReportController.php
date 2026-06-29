<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\User;
use App\Models\LeaveRequest;
use App\Models\LeaveBalance;

class ReportController extends Controller
{
    /**
     * Generate Employee Report
     */
    public function employees(Request $request): JsonResponse
    {
        $query = User::with(['team'])->withRole('Employee'); // Assuming we mainly report on standard employees, but we can allow all.
        
        if ($request->filled('team_id')) {
            $query->where('team_id', $request->team_id);
        }
        
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        $employees = $query->get()->map(function ($emp) {
            return [
                'ID' => $emp->id,
                'Employee Code' => $emp->employee_code,
                'Name' => $emp->first_name . ' ' . $emp->last_name,
                'Email' => $emp->email,
                'Role' => $emp->roles->pluck('name')->first(),
                'Team' => $emp->team ? $emp->team->name : 'N/A',
                'Status' => $emp->status,
                'Joining Date' => $emp->joining_date,
            ];
        });
        
        return response()->json([
            'status' => 'success',
            'data' => $employees
        ]);
    }

    /**
     * Generate Leave Report
     */
    public function leaves(Request $request): JsonResponse
    {
        $query = LeaveRequest::with(['user.team', 'leaveType']);
        
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('leave_date', [$request->start_date, $request->end_date]);
        }

        if ($request->filled('team_id')) {
            $query->whereHas('user', function ($q) use ($request) {
                $q->where('team_id', $request->team_id);
            });
        }
        
        $leaves = $query->get()->map(function ($leave) {
            return [
                'Leave ID' => $leave->id,
                'Employee Code' => $leave->user->employee_code ?? 'N/A',
                'Employee Name' => ($leave->user->first_name ?? '') . ' ' . ($leave->user->last_name ?? ''),
                'Team' => $leave->user && $leave->user->team ? $leave->user->team->name : 'N/A',
                'Leave Type' => $leave->leaveType->name ?? 'N/A',
                'Leave Date' => $leave->leave_date,
                'Duration Type' => $leave->duration_type,
                'Status' => $leave->status,
                'Reason' => $leave->reason
            ];
        });
        
        return response()->json([
            'status' => 'success',
            'data' => $leaves
        ]);
    }

    /**
     * Generate Leave Balances Report
     */
    public function leaveBalances(Request $request): JsonResponse
    {
        $query = LeaveBalance::with(['user.team']);
        
        if ($request->filled('team_id')) {
            $query->whereHas('user', function ($q) use ($request) {
                $q->where('team_id', $request->team_id);
            });
        }
        
        $balances = $query->get()->map(function ($balance) {
            return [
                'Employee Code' => $balance->user->employee_code ?? 'N/A',
                'Employee Name' => ($balance->user->first_name ?? '') . ' ' . ($balance->user->last_name ?? ''),
                'Team' => $balance->user && $balance->user->team ? $balance->user->team->name : 'N/A',
                'Casual Leave Balance' => $balance->casual_leave_balance,
                'Sick Leave Balance' => $balance->sick_leave_balance,
                'Total Taken' => $balance->total_leaves_taken,
            ];
        });
        
        return response()->json([
            'status' => 'success',
            'data' => $balances
        ]);
    }
}
