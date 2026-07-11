<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use App\Models\WfhRequest;
use App\Models\LeaveBalance;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ApprovedLeaveManagementController extends Controller
{
    public function listApprovedLeaves(Request $request)
    {
        $query = LeaveRequest::where('status', 'Approved')
            ->with(['user', 'leaveType']);

        // Employee filter
        if ($request->has('employee_id') && $request->employee_id) {
            $query->where('user_id', $request->employee_id);
        }

        // Date range filter
        if ($request->has('start_date') && $request->start_date) {
            $query->where('start_date', '>=', $request->start_date);
        }
        if ($request->has('end_date') && $request->end_date) {
            $query->where('end_date', '<=', $request->end_date);
        }

        $leaves = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'data' => $leaves,
            'count' => count($leaves)
        ]);
    }

    public function listApprovedWfh(Request $request)
    {
        $query = WfhRequest::where('status', 'Approved')
            ->with(['user']);

        // Employee filter
        if ($request->has('employee_id') && $request->employee_id) {
            $query->where('user_id', $request->employee_id);
        }

        // Date range filter
        if ($request->has('start_date') && $request->start_date) {
            $query->where('start_date', '>=', $request->start_date);
        }
        if ($request->has('end_date') && $request->end_date) {
            $query->where('end_date', '<=', $request->end_date);
        }

        $wfh = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'data' => $wfh,
            'count' => count($wfh)
        ]);
    }

    public function deleteApprovedLeave(Request $request, $leaveId)
    {
        try {
            $leave = LeaveRequest::find($leaveId);

            if (!$leave) {
                return response()->json(['message' => 'Leave not found'], 404);
            }

            if ($leave->status !== 'Approved') {
                return response()->json(['message' => 'Can only delete approved leaves'], 400);
            }

            DB::beginTransaction();

            // Get leave balance record
            $balance = LeaveBalance::where('user_id', $leave->user_id)->first();

            if ($balance) {
                // Get the exact paid amounts that were deducted
                $paidCL = $leave->paid_casual_leave ?? 0;
                $paidSL = $leave->paid_sick_leave ?? 0;

                // Restore casual leave with proper split handling
                if ($paidCL > 0) {
                    // Use the tracked split if available, otherwise estimate
                    $paidCLCarryForward = $leave->paid_cl_carry_forward ?? 0;
                    $paidCLCurrentYear = $leave->paid_cl_current_year ?? 0;

                    // Fallback: if not tracked, assume it came from current year
                    if ($paidCLCarryForward === 0 && $paidCLCurrentYear === 0) {
                        $paidCLCurrentYear = $paidCL;
                    }

                    // Restore both components
                    if ($paidCLCarryForward > 0) {
                        $balance->cl_carry_forward += $paidCLCarryForward;
                    }
                    if ($paidCLCurrentYear > 0) {
                        $balance->casual_leave_balance += $paidCLCurrentYear;
                    }
                }

                // Restore sick leave
                if ($paidSL > 0) {
                    $balance->sick_leave_balance += $paidSL;
                }

                // Revert total leaves taken
                $actualDays = $leave->actual_leave_days ?? $leave->days_taken ?? 0;
                $balance->total_leaves_taken -= $actualDays;
                $balance->save();
            }

            // Delete the leave request
            $leave->delete();

            DB::commit();

            return response()->json([
                'message' => 'Approved leave deleted and balance restored',
                'data' => $leave
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to delete approved leave', [
                'leave_id' => $leaveId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'message' => 'Failed to delete leave: ' . $e->getMessage()
            ], 500);
        }
    }

    public function deleteApprovedWfh(Request $request, $wfhId)
    {
        try {
            $wfh = WfhRequest::find($wfhId);

            if (!$wfh) {
                return response()->json(['message' => 'WFH request not found'], 404);
            }

            if ($wfh->status !== 'Approved') {
                return response()->json(['message' => 'Can only delete approved WFH requests'], 400);
            }

            DB::beginTransaction();

            // WFH typically doesn't affect leave balance, but log the deletion
            $wfh->delete();

            DB::commit();

            return response()->json([
                'message' => 'Approved WFH deleted successfully',
                'data' => $wfh
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to delete approved WFH', [
                'wfh_id' => $wfhId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'message' => 'Failed to delete WFH: ' . $e->getMessage()
            ], 500);
        }
    }
}
