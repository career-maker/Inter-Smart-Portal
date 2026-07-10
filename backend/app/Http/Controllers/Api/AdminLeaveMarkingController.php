<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\LeaveRequest;
use App\Models\WfhRequest;
use App\Models\LeaveType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminLeaveMarkingController extends Controller
{
    public function markLeave(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:users,id',
            'leave_type_id' => 'required|exists:leave_types,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'required|string|max:500',
        ]);

        $admin = $request->user();
        $employee = User::find($validated['employee_id']);

        if (!$employee) {
            return response()->json(['message' => 'Employee not found'], 404);
        }

        try {
            $leaveRequest = LeaveRequest::create([
                'user_id' => $employee->id,
                'leave_type_id' => $validated['leave_type_id'],
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'reason' => $validated['reason'] . ' [Admin marked]',
                'status' => 'Approved',
                'tl_status' => 'Not Required',
                'admin_status' => 'Approved',
                'approved_by' => $admin->id,
            ]);

            return response()->json([
                'message' => 'Leave marked successfully',
                'data' => $leaveRequest
            ], 201);
        } catch (\Exception $e) {
            \Log::error('Admin leave marking failed', [
                'employee_id' => $employee->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Failed to mark leave: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function markWfh(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:users,id',
            'wfh_type_id' => 'required|exists:leave_types,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'required|string|max:500',
        ]);

        $admin = $request->user();
        $employee = User::find($validated['employee_id']);

        if (!$employee) {
            return response()->json(['message' => 'Employee not found'], 404);
        }

        try {
            $wfhRequest = WfhRequest::create([
                'user_id' => $employee->id,
                'wfh_type_id' => $validated['wfh_type_id'],
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'wfh_date' => $validated['start_date'],
                'reason' => $validated['reason'] . ' [Admin marked]',
                'status' => 'Approved',
                'tl_status' => 'Not Required',
                'admin_status' => 'Approved',
                'approved_by' => $admin->id,
            ]);

            return response()->json([
                'message' => 'WFH marked successfully',
                'data' => $wfhRequest
            ], 201);
        } catch (\Exception $e) {
            \Log::error('Admin WFH marking failed', [
                'employee_id' => $employee->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Failed to mark WFH: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
