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
                $leaveTypeName = $leave->leaveType?->name ?? '';
                $daysCount     = floatval($leave->days_taken ?? $leave->actual_leave_days ?? $leave->days ?? 0);

                $paidCLCarryForward = floatval($leave->paid_cl_carry_forward ?? 0);
                $paidCLCurrentYear  = floatval($leave->paid_cl_current_year ?? 0);
                $paidCL             = floatval($leave->paid_casual_leave ?? 0);
                $paidSL             = floatval($leave->paid_sick_leave ?? 0);

                // Fallback for Casual Leave if split wasn't stored
                if ($paidCLCarryForward == 0 && $paidCLCurrentYear == 0) {
                    if ($paidCL > 0) {
                        $paidCLCurrentYear = $paidCL;
                    } elseif (stripos($leaveTypeName, 'Casual') !== false && !$leave->is_unpaid) {
                        $paidCLCurrentYear = $daysCount;
                    }
                }

                // Fallback for Sick Leave
                if ($paidSL == 0 && stripos($leaveTypeName, 'Sick') !== false && !$leave->is_unpaid) {
                    $paidSL = $daysCount;
                }

                if ($paidCLCarryForward > 0) {
                    $balance->cl_carry_forward = floatval($balance->cl_carry_forward ?? 0) + $paidCLCarryForward;
                }
                if ($paidCLCurrentYear > 0) {
                    $balance->casual_leave_balance = floatval($balance->casual_leave_balance ?? 0) + $paidCLCurrentYear;
                }
                if ($paidSL > 0) {
                    $balance->sick_leave_balance = floatval($balance->sick_leave_balance ?? 0) + $paidSL;
                }

                $deductedTotal = $paidCLCarryForward + $paidCLCurrentYear + $paidSL;
                if ($deductedTotal <= 0 && !$leave->is_unpaid) {
                    $deductedTotal = $daysCount;
                }

                $balance->total_leaves_taken = max(0, floatval($balance->total_leaves_taken ?? 0) - $deductedTotal);
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

            // Update status to Cancelled so the user sees Cancelled on their WFH page
            $wfh->update([
                'status'       => 'Cancelled',
                'tl_status'    => 'Cancelled',
                'admin_status' => 'Cancelled',
                'approved_by'  => $request->user()->id,
            ]);

            DB::commit();

            // Notify the employee
            try {
                $user = $request->user();
                $actorName = "{$user->first_name} {$user->last_name}";
                $msg = "Your approved WFH request for {$wfh->start_date} has been cancelled by {$actorName}.";
                $wfh->user->notify(new \App\Notifications\WfhRequestNotification('rejected', $wfh, $msg));
            } catch (\Exception $e) {}

            return response()->json([
                'message' => 'Approved WFH deleted successfully',
                'data' => $wfh->fresh()
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
