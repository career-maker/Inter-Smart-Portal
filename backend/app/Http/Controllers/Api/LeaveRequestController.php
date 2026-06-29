<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use App\Models\LeaveBalance;
use App\Models\LeaveLedger;
use App\Http\Requests\StoreLeaveRequest;
use App\Http\Requests\UpdateLeaveStatusRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class LeaveRequestController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = LeaveRequest::with(['user', 'leaveType', 'approver']);

        // Employees see their own. Team Leads see their team's. Admins/HR see all.
        if ($user->hasRole('Super Admin') || $user->hasRole('HR')) {
            // No restriction
        } elseif ($user->hasRole('Team Lead')) {
            // Team leads see their own and their team members
            $teamId = $user->team_id;
            $query->whereHas('user', function ($q) use ($teamId) {
                $q->where('team_id', $teamId);
            });
        } else {
            // Everyone else (Employee) only sees their own
            $query->where('user_id', $user->id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        return response()->json([
            'data' => $query->orderBy('created_at', 'desc')->paginate(10)
        ]);
    }

    public function store(StoreLeaveRequest $request)
    {
        $user = $request->user();
        $data = $request->validated();
        $startDate = Carbon::parse($data['start_date']);
        $endDate = Carbon::parse($data['end_date']);
        $rawDays = $startDate->diffInDays($endDate) + 1;
        
        $leaveType = \App\Models\LeaveType::find($data['leave_type_id']);
        $isHalf = str_contains(strtolower($leaveType->name ?? ''), 'half');
        $days = $isHalf ? ($rawDays * 0.5) : $rawDays;

        // Check balance
        $balance = LeaveBalance::where('user_id', $user->id)->first();
        if (!$balance) {
            return response()->json(['message' => 'Leave balance record not found'], 400);
        }

        // We assume 2 main types based on the schema: Casual and Sick
        if ($leaveType && str_contains(strtolower($leaveType->name), 'casual')) {
            if ($balance->casual_leave_balance < $days) {
                return response()->json(['message' => 'Insufficient casual leave balance'], 400);
            }
        } elseif ($leaveType && str_contains(strtolower($leaveType->name), 'sick')) {
            if ($balance->sick_leave_balance < $days) {
                return response()->json(['message' => 'Insufficient sick leave balance'], 400);
            }
        }

        DB::beginTransaction();
        try {
            // Deduct balance immediately
            if ($leaveType && str_contains(strtolower($leaveType->name), 'casual')) {
                $balance->casual_leave_balance -= $days;
            } elseif ($leaveType && str_contains(strtolower($leaveType->name), 'sick')) {
                $balance->sick_leave_balance -= $days;
            }
            $balance->total_leaves_taken += $days;
            $balance->save();

            // Create Request
            $leaveRequest = LeaveRequest::create([
                'user_id' => $user->id,
                'leave_type_id' => $data['leave_type_id'],
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
                'days' => $days,
                'reason' => $data['reason'],
                'status' => 'Pending'
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Leave applied successfully',
                'data' => $leaveRequest
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to apply leave', 'error' => $e->getMessage()], 500);
        }
    }

    public function updateStatus(UpdateLeaveStatusRequest $request, LeaveRequest $leaveRequest)
    {
        $user = $request->user();
        $data = $request->validated();

        if ($leaveRequest->status !== 'Pending') {
            return response()->json(['message' => 'Only pending requests can be updated'], 400);
        }

        $applicant = $leaveRequest->user;
        
        if ($user->hasRole('Super Admin') || $user->hasRole('HR')) {
            // Authorized
        } elseif ($user->hasRole('Team Lead')) {
            if ($applicant->team_id !== $user->team_id) {
                return response()->json(['message' => 'Unauthorized to approve this request.'], 403);
            }
            if ($applicant->hasRole('Team Lead')) {
                return response()->json(['message' => 'Team Lead requests must be approved by a Super Admin.'], 403);
            }
        } else {
            return response()->json(['message' => 'Unauthorized to approve requests.'], 403);
        }

        DB::beginTransaction();
        try {
            $leaveRequest->update([
                'status' => $data['status'],
                'approved_by' => $user->id,
                'rejection_reason' => $data['rejection_reason'] ?? null
            ]);

            if ($data['status'] === 'Rejected') {
                // Refund the balance
                $balance = LeaveBalance::where('user_id', $leaveRequest->user_id)->first();
                $leaveType = $leaveRequest->leaveType;
                $days = $leaveRequest->days;

                if ($balance && $leaveType) {
                    if (str_contains(strtolower($leaveType->name), 'casual')) {
                        $balance->casual_leave_balance += $days;
                    } elseif (str_contains(strtolower($leaveType->name), 'sick')) {
                        $balance->sick_leave_balance += $days;
                    }
                    $balance->total_leaves_taken -= $days;
                    $balance->save();
                }
            }

            DB::commit();

            return response()->json([
                'message' => "Leave request {$data['status']} successfully",
                'data' => $leaveRequest
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update leave request'], 500);
        }
    }
}
