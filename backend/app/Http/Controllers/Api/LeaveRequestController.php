<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use App\Models\LeaveBalance;
use App\Models\LeaveLedger;
use App\Models\LeaveAuditLog;
use App\Models\WorkingDaysOverride;
use App\Models\Holiday;
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
            if ($request->has('status') && $request->status === 'Pending') {
                $query->where('admin_status', 'Pending')
                      ->whereIn('tl_status', ['Approved', 'Not Required']);
            } elseif ($request->has('status')) {
                $query->where('status', $request->status);
            }
        } elseif ($user->hasRole('Team Lead')) {
            // Team leads see their own and their team members
            $teamId = $user->team_id;
            $query->whereHas('user', function ($q) use ($teamId) {
                $q->where('team_id', $teamId);
            });
            if ($request->has('status') && $request->status === 'Pending') {
                $query->where('tl_status', 'Pending');
            } elseif ($request->has('status')) {
                $query->where('status', $request->status);
            }
        } else {
            // Everyone else (Employee) only sees their own
            $query->where('user_id', $user->id);
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }
        }

        return response()->json([
            'data' => $query->orderBy('created_at', 'desc')->paginate(10)
        ]);
    }

    private function calculateLeaveImpact($user, $leaveTypeId, $startDateStr, $endDateStr)
    {
        $leaveType = \App\Models\LeaveType::find($leaveTypeId);
        $startDate = Carbon::parse($startDateStr);
        $endDate = Carbon::parse($endDateStr);
        $today = Carbon::today();
        
        $isUnpaid = false;
        $unpaidReason = null;
        $sandwichLeaveDays = 0;
        
        // Casual Leave 3-day rule
        $isCasual = str_contains(strtolower($leaveType->name ?? ''), 'casual');
        if ($isCasual) {
            if ($today->diffInDays($startDate, false) < 3) {
                $isUnpaid = true;
                $unpaidReason = "Casual Leave must be applied at least 3 days before the leave date.";
            }
        }
        
        // Sandwich calculation
        $holidays = Holiday::pluck('date')->map(fn($d) => Carbon::parse($d)->format('Y-m-d'))->toArray();
        $workingOverrides = WorkingDaysOverride::pluck('date')->map(fn($d) => Carbon::parse($d)->format('Y-m-d'))->toArray();
        
        $totalDays = 0;
        $nonWorkingDaysInRange = 0;
        
        $current = $startDate->copy();
        while ($current->lte($endDate)) {
            $totalDays++;
            $dateStr = $current->format('Y-m-d');
            
            $isWeekend = $current->isWeekend();
            $isHoliday = in_array($dateStr, $holidays);
            $isWorkingOverride = in_array($dateStr, $workingOverrides);
            
            if (($isWeekend || $isHoliday) && !$isWorkingOverride) {
                $nonWorkingDaysInRange++;
            }
            
            $current->addDay();
        }
        
        $isWorkingDay = function($date) use ($holidays, $workingOverrides) {
            $dateStr = $date->format('Y-m-d');
            if (in_array($dateStr, $workingOverrides)) return true;
            if ($date->isWeekend() || in_array($dateStr, $holidays)) return false;
            return true;
        };
        
        $hasLeaveOn = function($date) use ($user) {
            return LeaveRequest::where('user_id', $user->id)
                ->where('status', '!=', 'Rejected')
                ->where(function($q) use ($date) {
                    $q->where('start_date', '<=', $date->format('Y-m-d'))
                      ->where('end_date', '>=', $date->format('Y-m-d'));
                })->exists();
        };

        $isHalf = str_contains(strtolower($leaveType->name ?? ''), 'half');
        $actualWorkingDays = $totalDays - $nonWorkingDaysInRange;
        $baseWorkingDays = $isHalf ? ($actualWorkingDays * 0.5) : $actualWorkingDays;
        
        if ($nonWorkingDaysInRange > 0) {
            $sandwichLeaveDays = $nonWorkingDaysInRange;
            $isUnpaid = true;
            if (!$unpaidReason) $unpaidReason = "Leave encompasses company holidays or weekends (Sandwich Leave).";
        } else {
            // Check adjacent left
            $prevDay = $startDate->copy()->subDay();
            $leftNonWorkingDays = 0;
            while (!$isWorkingDay($prevDay)) {
                $leftNonWorkingDays++;
                $prevDay->subDay();
            }
            if ($leftNonWorkingDays > 0 && $hasLeaveOn($prevDay)) {
                $sandwichLeaveDays += $leftNonWorkingDays;
                $isUnpaid = true;
                if (!$unpaidReason) $unpaidReason = "Forms a sandwich with an existing previous leave.";
            }
            
            // Check adjacent right
            $nextDay = $endDate->copy()->addDay();
            $rightNonWorkingDays = 0;
            while (!$isWorkingDay($nextDay)) {
                $rightNonWorkingDays++;
                $nextDay->addDay();
            }
            if ($rightNonWorkingDays > 0 && $hasLeaveOn($nextDay)) {
                $sandwichLeaveDays += $rightNonWorkingDays;
                $isUnpaid = true;
                if (!$unpaidReason) $unpaidReason = "Forms a sandwich with an existing upcoming leave.";
            }
        }
        
        $actualLeaveDays = $baseWorkingDays + $sandwichLeaveDays;
        
        return [
            'actual_leave_days' => $actualLeaveDays,
            'sandwich_leave_days' => $sandwichLeaveDays,
            'is_unpaid' => $isUnpaid,
            'unpaid_reason' => $unpaidReason
        ];
    }

    public function calculate(Request $request)
    {
        $request->validate([
            'leave_type_id' => 'required|exists:leave_types,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $impact = $this->calculateLeaveImpact(
            $request->user(),
            $request->leave_type_id,
            $request->start_date,
            $request->end_date
        );

        return response()->json($impact);
    }

    public function store(StoreLeaveRequest $request)
    {
        $user = $request->user();
        $data = $request->validated();
        
        $leaveType = \App\Models\LeaveType::find($data['leave_type_id']);
        $impact = $this->calculateLeaveImpact($user, $data['leave_type_id'], $data['start_date'], $data['end_date']);
        $days = $impact['actual_leave_days'];
        $isUnpaid = $impact['is_unpaid'];
        $rawDays = Carbon::parse($data['start_date'])->diffInDays(Carbon::parse($data['end_date'])) + 1;

        // Check balance only if paid
        $balance = LeaveBalance::where('user_id', $user->id)->first();
        if (!$balance) {
            return response()->json(['message' => 'Leave balance record not found'], 400);
        }

        if (!$isUnpaid) {
            if ($leaveType && str_contains(strtolower($leaveType->name), 'casual')) {
                if ($balance->casual_leave_balance < $days) {
                    return response()->json(['message' => 'Insufficient casual leave balance'], 400);
                }
            } elseif ($leaveType && str_contains(strtolower($leaveType->name), 'sick')) {
                if ($balance->sick_leave_balance < $days) {
                    return response()->json(['message' => 'Insufficient sick leave balance'], 400);
                }
            }
        }

        DB::beginTransaction();
        try {
            if (!$isUnpaid) {
                if ($leaveType && str_contains(strtolower($leaveType->name), 'casual')) {
                    $balance->casual_leave_balance -= $days;
                } elseif ($leaveType && str_contains(strtolower($leaveType->name), 'sick')) {
                    $balance->sick_leave_balance -= $days;
                }
            }
            $balance->total_leaves_taken += $days;
            $balance->save();

            $tlStatus = 'Pending';
            $adminStatus = 'Not Required';
            
            if ($rawDays > 1 || $isUnpaid) {
                $adminStatus = 'Pending';
            }
            
            if ($user->hasRole('Team Lead')) {
                $tlStatus = 'Not Required';
                $adminStatus = 'Pending';
            }
            
            if ($user->hasRole('Super Admin') || $user->hasRole('HR')) {
                $tlStatus = 'Not Required';
                $adminStatus = 'Pending';
            }

            $leaveRequest = LeaveRequest::create([
                'user_id' => $user->id,
                'leave_type_id' => $data['leave_type_id'],
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
                'days' => $days,
                'reason' => $data['reason'],
                'status' => 'Pending',
                'tl_status' => $tlStatus,
                'admin_status' => $adminStatus,
                'is_unpaid' => $isUnpaid,
                'unpaid_reason' => $impact['unpaid_reason'],
                'sandwich_leave_days' => $impact['sandwich_leave_days'],
                'actual_leave_days' => $days,
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
            $status = $data['status']; // 'Approved' or 'Rejected'
            
            if ($status === 'Rejected') {
                $leaveRequest->update([
                    'status' => 'Rejected',
                    'tl_status' => $user->hasRole('Team Lead') ? 'Rejected' : $leaveRequest->tl_status,
                    'admin_status' => ($user->hasRole('Super Admin') || $user->hasRole('HR')) ? 'Rejected' : $leaveRequest->admin_status,
                    'approved_by' => $user->id,
                    'rejection_reason' => $data['rejection_reason'] ?? null
                ]);

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
            } else if ($status === 'Approved') {
                if ($user->hasRole('Team Lead') && !$user->hasRole('Super Admin') && !$user->hasRole('HR')) {
                    $leaveRequest->tl_status = 'Approved';
                    
                    if ($leaveRequest->admin_status === 'Not Required') {
                        $leaveRequest->status = 'Approved';
                        $leaveRequest->approved_by = $user->id;
                    }
                } else if ($user->hasRole('Super Admin') || $user->hasRole('HR')) {
                    $leaveRequest->admin_status = 'Approved';
                    
                    if ($leaveRequest->tl_status === 'Approved' || $leaveRequest->tl_status === 'Not Required') {
                        $leaveRequest->status = 'Approved';
                    }
                    $leaveRequest->approved_by = $user->id;
                }
                $leaveRequest->save();
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

    public function override(Request $request, LeaveRequest $leaveRequest)
    {
        $user = $request->user();
        if (!$user->hasRole('Super Admin')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $request->validate([
            'is_unpaid' => 'required|boolean',
            'actual_leave_days' => 'required|numeric',
            'remarks' => 'required|string|max:500'
        ]);

        DB::beginTransaction();
        try {
            $oldUnpaid = $leaveRequest->is_unpaid;
            $oldDays = $leaveRequest->actual_leave_days ?? $leaveRequest->days;
            
            $newUnpaid = $request->is_unpaid;
            $newDays = $request->actual_leave_days;
            
            // Refund old days if they were paid
            $balance = LeaveBalance::where('user_id', $leaveRequest->user_id)->first();
            $leaveType = $leaveRequest->leaveType;
            
            if ($balance && $leaveType) {
                // Revert previous deduction
                if (!$oldUnpaid && $leaveRequest->status !== 'Rejected') {
                    if (str_contains(strtolower($leaveType->name), 'casual')) {
                        $balance->casual_leave_balance += $oldDays;
                    } elseif (str_contains(strtolower($leaveType->name), 'sick')) {
                        $balance->sick_leave_balance += $oldDays;
                    }
                    $balance->total_leaves_taken -= $oldDays;
                }
                
                // Apply new deduction
                if (!$newUnpaid && $leaveRequest->status !== 'Rejected') {
                    if (str_contains(strtolower($leaveType->name), 'casual')) {
                        $balance->casual_leave_balance -= $newDays;
                    } elseif (str_contains(strtolower($leaveType->name), 'sick')) {
                        $balance->sick_leave_balance -= $newDays;
                    }
                    $balance->total_leaves_taken += $newDays;
                }
                
                $balance->save();
            }

            LeaveAuditLog::create([
                'leave_request_id' => $leaveRequest->id,
                'modified_by' => $user->id,
                'previous_value' => json_encode(['is_unpaid' => $oldUnpaid, 'actual_leave_days' => $oldDays]),
                'new_value' => json_encode(['is_unpaid' => $newUnpaid, 'actual_leave_days' => $newDays]),
                'remarks' => $request->remarks,
            ]);

            $leaveRequest->update([
                'is_unpaid' => $newUnpaid,
                'actual_leave_days' => $newDays,
                'days' => $newDays,
                'unpaid_reason' => $newUnpaid ? ($leaveRequest->unpaid_reason ?? 'Overridden to unpaid') : null
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Leave request overridden successfully.',
                'data' => $leaveRequest
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to override leave request', 'error' => $e->getMessage()], 500);
        }
    }
}
