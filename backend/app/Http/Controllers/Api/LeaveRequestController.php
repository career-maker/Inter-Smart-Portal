<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use App\Models\LeaveBalance;
use App\Models\LeaveLedger;
use App\Models\LeaveAuditLog;
use App\Models\WorkingDaysOverride;
use App\Models\Holiday;
use App\Models\User;
use App\Http\Requests\StoreLeaveRequest;
use App\Http\Requests\UpdateLeaveStatusRequest;
use App\Notifications\LeaveRequestNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class LeaveRequestController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = LeaveRequest::with(['user', 'leaveType', 'approver']);

        if ($user->hasRole('Super Admin') || $user->hasRole('HR')) {
            if ($request->has('status') && $request->status === 'Pending') {
                // Admin sees:
                //   - multi-day: after TL has acted (Approved or Not Required)
                //   - single-day: immediately (either approver can act first)
                $query->where('admin_status', 'Pending')
                      ->where('status', 'Pending')
                      ->where(function ($q) {
                          $q->whereIn('tl_status', ['Approved', 'Not Required'])
                            ->orWhereColumn('start_date', 'end_date');
                      });
            } elseif ($request->has('status')) {
                $query->where('status', $request->status);
            }
        } elseif ($user->hasRole('Team Lead')) {
            $teamId = $user->team_id;
            $query->whereHas('user', function ($q) use ($teamId) {
                $q->where('team_id', $teamId);
            });
            if ($request->has('status') && $request->status === 'Pending') {
                $query->where('tl_status', 'Pending')->where('status', 'Pending');
            } elseif ($request->has('status')) {
                $query->where('status', $request->status);
            }
        } else {
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
        $endDate   = Carbon::parse($endDateStr);
        $today     = Carbon::today();

        $isCasual = str_contains(strtolower($leaveType->name ?? ''), 'casual');
        $isHalf   = str_contains(strtolower($leaveType->name ?? ''), 'half');

        // Probation check — all leave during probation is unpaid
        if ($user->isInProbation()) {
            $probationEnd = $user->probationEndDate();
            $totalDays = $startDate->diffInDays($endDate) + 1;
            return [
                'actual_leave_days'       => $totalDays,
                'requested_working_days'  => $totalDays,
                'sandwich_leave_days'     => 0,
                'is_unpaid'               => true,
                'unpaid_reason'           => "You are currently under probation. Paid leave benefits will be activated only after: " . Carbon::parse($probationEnd)->format('d M Y') . ".",
                'is_probation'            => true,
                'probation_end_date'      => $probationEnd,
            ];
        }

        $isUnpaid        = false;
        $unpaidReason    = null;
        $sandwichDays    = 0;

        // CL 3-day advance rule (only thing that can make CL unpaid)
        if ($isCasual && $today->diffInDays($startDate, false) < 3) {
            $isUnpaid     = true;
            $unpaidReason = "Casual Leave must be applied at least 3 days before the leave date.";
        }

        $holidays         = Holiday::pluck('date')->map(fn($d) => Carbon::parse($d)->format('Y-m-d'))->toArray();
        $workingOverrides = WorkingDaysOverride::pluck('date')->map(fn($d) => Carbon::parse($d)->format('Y-m-d'))->toArray();

        $totalDays           = 0;
        $nonWorkingInRange   = 0;
        $current             = $startDate->copy();

        while ($current->lte($endDate)) {
            $totalDays++;
            $dateStr = $current->format('Y-m-d');
            if (($current->isWeekend() || in_array($dateStr, $holidays)) && !in_array($dateStr, $workingOverrides)) {
                $nonWorkingInRange++;
            }
            $current->addDay();
        }

        $isWorkingDay = function ($date) use ($holidays, $workingOverrides) {
            $dateStr = $date->format('Y-m-d');
            if (in_array($dateStr, $workingOverrides)) return true;
            if ($date->isWeekend() || in_array($dateStr, $holidays)) return false;
            return true;
        };

        $hasLeaveOn = function ($date) use ($user) {
            return LeaveRequest::where('user_id', $user->id)
                ->where('status', '!=', 'Rejected')
                ->where(function ($q) use ($date) {
                    $q->where('start_date', '<=', $date->format('Y-m-d'))
                      ->where('end_date', '>=', $date->format('Y-m-d'));
                })->exists();
        };

        $actualWorkingDays = $totalDays - $nonWorkingInRange;
        $baseWorkingDays   = $isHalf ? ($actualWorkingDays * 0.5) : $actualWorkingDays;

        if ($nonWorkingInRange > 0) {
            $sandwichDays = $nonWorkingInRange;
            // Non-CL sandwich → LWP. CL is only affected by the 3-day rule above.
            if (!$isCasual) {
                $isUnpaid     = true;
                $unpaidReason = $unpaidReason ?? "Leave encompasses company holidays or weekends (Sandwich Leave).";
            }
        } else {
            // Adjacent sandwich (only for non-CL)
            if (!$isCasual) {
                $prevDay          = $startDate->copy()->subDay();
                $leftNonWorking   = 0;
                while (!$isWorkingDay($prevDay)) {
                    $leftNonWorking++;
                    $prevDay->subDay();
                }
                if ($leftNonWorking > 0 && $hasLeaveOn($prevDay)) {
                    $sandwichDays += $leftNonWorking;
                    $isUnpaid      = true;
                    $unpaidReason  = $unpaidReason ?? "Forms a sandwich with an existing previous leave.";
                }

                $nextDay          = $endDate->copy()->addDay();
                $rightNonWorking  = 0;
                while (!$isWorkingDay($nextDay)) {
                    $rightNonWorking++;
                    $nextDay->addDay();
                }
                if ($rightNonWorking > 0 && $hasLeaveOn($nextDay)) {
                    $sandwichDays += $rightNonWorking;
                    $isUnpaid      = true;
                    $unpaidReason  = $unpaidReason ?? "Forms a sandwich with an existing upcoming leave.";
                }
            }
        }

        $actualLeaveDays = $baseWorkingDays + $sandwichDays;

        return [
            'requested_working_days' => $baseWorkingDays,
            'actual_leave_days'      => $actualLeaveDays,
            'sandwich_leave_days'    => $sandwichDays,
            'is_unpaid'              => $isUnpaid,
            'unpaid_reason'          => $unpaidReason,
            'is_probation'           => false,
        ];
    }

    public function calculate(Request $request)
    {
        $request->validate([
            'leave_type_id' => 'required|exists:leave_types,id',
            'start_date'    => 'required|date',
            'end_date'      => 'required|date|after_or_equal:start_date',
        ]);

        return response()->json(
            $this->calculateLeaveImpact(
                $request->user(),
                $request->leave_type_id,
                $request->start_date,
                $request->end_date
            )
        );
    }

    public function store(StoreLeaveRequest $request)
    {
        $user      = $request->user();
        $data      = $request->validated();
        $leaveType = \App\Models\LeaveType::find($data['leave_type_id']);
        $impact    = $this->calculateLeaveImpact($user, $data['leave_type_id'], $data['start_date'], $data['end_date']);
        $days      = $impact['actual_leave_days'];
        $isUnpaid  = $impact['is_unpaid'];
        $isSingleDay = ($data['start_date'] === $data['end_date']);
        $rawDays   = Carbon::parse($data['start_date'])->diffInDays(Carbon::parse($data['end_date'])) + 1;

        $balance = LeaveBalance::where('user_id', $user->id)->first();
        if (!$balance) {
            return response()->json(['message' => 'Leave balance record not found'], 400);
        }

        // Balance check (only for paid leaves)
        if (!$isUnpaid) {
            if ($leaveType && str_contains(strtolower($leaveType->name), 'casual')) {
                $totalCL = $balance->casual_leave_balance + ($balance->cl_carry_forward ?? 0);
                if ($totalCL < $days) {
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
                    // Deduct from carry-forward first, then current balance
                    $remaining   = $days;
                    $carryForward = $balance->cl_carry_forward ?? 0;
                    if ($carryForward > 0) {
                        $fromCF = min($remaining, $carryForward);
                        $balance->cl_carry_forward -= $fromCF;
                        $remaining -= $fromCF;
                    }
                    if ($remaining > 0) {
                        $balance->casual_leave_balance -= $remaining;
                    }
                } elseif ($leaveType && str_contains(strtolower($leaveType->name), 'sick')) {
                    $balance->sick_leave_balance -= $days;
                }
            }
            $balance->total_leaves_taken += $days;
            $balance->save();

            // Determine workflow statuses
            $tlStatus    = 'Pending';
            $adminStatus = 'Not Required';

            // Single-day: both TL and Admin are notified; either can approve
            if ($isSingleDay || $rawDays > 1 || $isUnpaid) {
                $adminStatus = 'Pending';
            }

            if ($user->hasRole('Team Lead')) {
                $tlStatus    = 'Not Required';
                $adminStatus = 'Pending';
            }

            if ($user->hasRole('Super Admin') || $user->hasRole('HR')) {
                $tlStatus    = 'Not Required';
                $adminStatus = 'Pending';
            }

            $leaveRequest = LeaveRequest::create([
                'user_id'                => $user->id,
                'leave_type_id'          => $data['leave_type_id'],
                'start_date'             => $data['start_date'],
                'end_date'               => $data['end_date'],
                'days'                   => $days,
                'reason'                 => $data['reason'],
                'status'                 => 'Pending',
                'tl_status'              => $tlStatus,
                'admin_status'           => $adminStatus,
                'is_unpaid'              => $isUnpaid,
                'unpaid_reason'          => $impact['unpaid_reason'],
                'sandwich_leave_days'    => $impact['sandwich_leave_days'],
                'actual_leave_days'      => $days,
            ]);

            DB::commit();

            // Send notifications outside the transaction
            $this->notifyOnSubmit($user, $leaveRequest, $leaveType);

            return response()->json([
                'message' => 'Leave applied successfully',
                'data'    => $leaveRequest
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to apply leave', 'error' => $e->getMessage()], 500);
        }
    }

    private function notifyOnSubmit($user, LeaveRequest $leaveRequest, $leaveType): void
    {
        try {
            $typeName = $leaveType->name ?? 'Leave';
            $fullName = "{$user->first_name} {$user->last_name}";
            $message  = "{$fullName} has submitted a new {$typeName} request ({$leaveRequest->start_date} to {$leaveRequest->end_date}).";

            // Notify all Super Admins
            $superAdmins = User::role('Super Admin')->get();
            foreach ($superAdmins as $admin) {
                if ($admin->id !== $user->id) {
                    $admin->notify(new LeaveRequestNotification('submitted', $leaveRequest, $message));
                }
            }

            // Notify the user's Team Lead
            if ($user->team_id) {
                $team = \App\Models\Team::find($user->team_id);
                $tl   = $team?->teamLead;
                if ($tl && $tl->id !== $user->id) {
                    $tl->notify(new LeaveRequestNotification('submitted', $leaveRequest, $message));
                }
            }
        } catch (\Exception $e) {
            // Notification failure should never block leave submission
        }
    }

    public function updateStatus(UpdateLeaveStatusRequest $request, LeaveRequest $leaveRequest)
    {
        $user      = $request->user();
        $data      = $request->validated();
        $status    = $data['status'];

        if ($leaveRequest->status !== 'Pending') {
            return response()->json(['message' => 'Only pending requests can be updated'], 400);
        }

        $applicant   = $leaveRequest->user;
        $isSingleDay = (Carbon::parse($leaveRequest->start_date)->format('Y-m-d') === Carbon::parse($leaveRequest->end_date)->format('Y-m-d'));

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
            if ($status === 'Rejected') {
                // Single-day: close out the other approver immediately
                $newTlStatus    = $user->hasRole('Team Lead') ? 'Rejected' : ($isSingleDay ? 'Not Required' : $leaveRequest->tl_status);
                $newAdminStatus = ($user->hasRole('Super Admin') || $user->hasRole('HR')) ? 'Rejected' : ($isSingleDay ? 'Not Required' : $leaveRequest->admin_status);

                $leaveRequest->update([
                    'status'           => 'Rejected',
                    'tl_status'        => $newTlStatus,
                    'admin_status'     => $newAdminStatus,
                    'approved_by'      => $user->id,
                    'rejection_reason' => $data['rejection_reason'] ?? null,
                ]);

                // Refund balance
                $balance   = LeaveBalance::where('user_id', $leaveRequest->user_id)->first();
                $leaveType = $leaveRequest->leaveType;
                $days      = $leaveRequest->days;

                if ($balance && $leaveType && !$leaveRequest->is_unpaid) {
                    if (str_contains(strtolower($leaveType->name), 'casual')) {
                        $balance->casual_leave_balance += $days;
                    } elseif (str_contains(strtolower($leaveType->name), 'sick')) {
                        $balance->sick_leave_balance += $days;
                    }
                    $balance->total_leaves_taken -= $days;
                    $balance->save();
                }

                // Notify employee
                $this->notifyEmployee($leaveRequest, $user, 'rejected');

            } elseif ($status === 'Approved') {
                $isTL    = $user->hasRole('Team Lead') && !$user->hasRole('Super Admin') && !$user->hasRole('HR');
                $isAdmin = $user->hasRole('Super Admin') || $user->hasRole('HR');

                if ($isTL) {
                    $leaveRequest->tl_status = 'Approved';
                    // Single-day: TL approval alone is sufficient
                    if ($isSingleDay || $leaveRequest->admin_status === 'Not Required') {
                        $leaveRequest->status       = 'Approved';
                        $leaveRequest->approved_by  = $user->id;
                        if ($isSingleDay) {
                            $leaveRequest->admin_status = 'Not Required';
                        }
                    }
                } elseif ($isAdmin) {
                    $leaveRequest->admin_status = 'Approved';
                    $leaveRequest->approved_by  = $user->id;
                    // Single-day: Admin approval alone is sufficient
                    if ($isSingleDay || in_array($leaveRequest->tl_status, ['Approved', 'Not Required'])) {
                        $leaveRequest->status = 'Approved';
                        if ($isSingleDay) {
                            $leaveRequest->tl_status = 'Not Required';
                        }
                    }
                }
                $leaveRequest->save();

                if ($leaveRequest->status === 'Approved') {
                    $this->notifyEmployee($leaveRequest, $user, 'approved');
                }
            }

            DB::commit();

            return response()->json([
                'message' => "Leave request {$status} successfully",
                'data'    => $leaveRequest
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update leave request', 'error' => $e->getMessage()], 500);
        }
    }

    private function notifyEmployee(LeaveRequest $leaveRequest, $actor, string $event): void
    {
        try {
            $employee  = $leaveRequest->user;
            $actorName = "{$actor->first_name} {$actor->last_name}";
            $typeName  = $leaveRequest->leaveType->name ?? 'Leave';
            $message   = $event === 'approved'
                ? "Your {$typeName} request has been approved by {$actorName}."
                : "Your {$typeName} request has been rejected by {$actorName}.";

            $employee->notify(new LeaveRequestNotification($event, $leaveRequest, $message));
        } catch (\Exception $e) {
            // Don't let notification failure break the approval
        }
    }

    public function override(Request $request, LeaveRequest $leaveRequest)
    {
        $user = $request->user();
        if (!$user->hasRole('Super Admin')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $request->validate([
            'is_unpaid'         => 'required|boolean',
            'actual_leave_days' => 'required|numeric',
            'remarks'           => 'required|string|max:500',
        ]);

        DB::beginTransaction();
        try {
            $oldUnpaid = $leaveRequest->is_unpaid;
            $oldDays   = $leaveRequest->actual_leave_days ?? $leaveRequest->days;
            $newUnpaid = $request->is_unpaid;
            $newDays   = $request->actual_leave_days;

            $balance   = LeaveBalance::where('user_id', $leaveRequest->user_id)->first();
            $leaveType = $leaveRequest->leaveType;

            if ($balance && $leaveType) {
                if (!$oldUnpaid && $leaveRequest->status !== 'Rejected') {
                    if (str_contains(strtolower($leaveType->name), 'casual')) {
                        $balance->casual_leave_balance += $oldDays;
                    } elseif (str_contains(strtolower($leaveType->name), 'sick')) {
                        $balance->sick_leave_balance += $oldDays;
                    }
                    $balance->total_leaves_taken -= $oldDays;
                }

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
                'modified_by'      => $user->id,
                'previous_value'   => json_encode(['is_unpaid' => $oldUnpaid, 'actual_leave_days' => $oldDays]),
                'new_value'        => json_encode(['is_unpaid' => $newUnpaid, 'actual_leave_days' => $newDays]),
                'remarks'          => $request->remarks,
            ]);

            $leaveRequest->update([
                'is_unpaid'         => $newUnpaid,
                'actual_leave_days' => $newDays,
                'days'              => $newDays,
                'unpaid_reason'     => $newUnpaid ? ($leaveRequest->unpaid_reason ?? 'Overridden to unpaid') : null,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Leave request overridden successfully.',
                'data'    => $leaveRequest
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to override leave request', 'error' => $e->getMessage()], 500);
        }
    }
}
