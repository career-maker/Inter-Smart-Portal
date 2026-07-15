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
        $query = LeaveRequest::with(['user', 'leaveType', 'approver'])
            ->select('leave_requests.*', 'attachment_link');

        if ($user->hasRole('Super Admin') || $user->hasRole('HR')) {
            if ($request->has('status') && $request->status === 'Pending') {
                $query->where(function ($mainQ) {
                    $mainQ->where(function ($subQ) {
                        $subQ->where('admin_status', 'Pending')
                             ->where('status', 'Pending')
                             ->where(function ($q) {
                                 $q->whereIn('tl_status', ['Approved', 'Not Required'])
                                   ->orWhereColumn('start_date', 'end_date');
                             });
                    })->orWhere('pending_lop_conversion', true);
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

        // Filter by Date Range
        if ($request->filled('from_date')) {
            $query->where('start_date', '>=', $request->from_date);
        }
        if ($request->filled('to_date')) {
            $query->where('end_date', '<=', $request->to_date);
        }

        // Filter by Type (casual, sick, lop)
        if ($request->filled('type')) {
            $type = $request->type;
            if ($type === 'casual') {
                $query->whereHas('leaveType', function ($q) {
                    $q->whereRaw('LOWER(name) LIKE ?', ['%casual%']);
                });
            } elseif ($type === 'sick') {
                $query->whereHas('leaveType', function ($q) {
                    $q->whereRaw('LOWER(name) LIKE ?', ['%sick%']);
                });
            } elseif ($type === 'lop') {
                $query->where('is_unpaid', true);
            }
        }

        // Filtered Totals
        // Clone the query to calculate totals before sorting and paginating
        $totalQuery = clone $query;
        // Only count approved leaves for totals
        $totalQuery->where('status', 'Approved');

        $filteredTotals = [
            'casual' => (float) (clone $totalQuery)->whereHas('leaveType', function ($q) {
                $q->whereRaw('LOWER(name) LIKE ?', ['%casual%']);
            })->sum(\DB::raw('COALESCE(actual_leave_days, days, 0)')),
            
            'sick' => (float) (clone $totalQuery)->whereHas('leaveType', function ($q) {
                $q->whereRaw('LOWER(name) LIKE ?', ['%sick%']);
            })->sum(\DB::raw('COALESCE(actual_leave_days, days, 0)')),
            
            'lop' => (float) (clone $totalQuery)->where('is_unpaid', true)->sum(\DB::raw('COALESCE(actual_leave_days, days, 0)')),
            
            'total' => (float) (clone $totalQuery)->sum(\DB::raw('COALESCE(actual_leave_days, days, 0)')),
        ];

        return response()->json([
            'data' => $query->orderBy('created_at', 'desc')->paginate(10),
            'filtered_totals' => $filteredTotals
        ]);
    }

    private function calculateLeaveImpact($user, $leaveTypeId, $startDateStr, $endDateStr, $durationType = 'Full')
    {
        $leaveType = \App\Models\LeaveType::find($leaveTypeId);
        $startDate = Carbon::parse($startDateStr);
        $endDate   = Carbon::parse($endDateStr);
        $today     = Carbon::today('Asia/Kolkata');

        $isCasual = str_contains(strtolower($leaveType->name ?? ''), 'casual');
        $isSick   = str_contains(strtolower($leaveType->name ?? ''), 'sick');
        $isHalf   = in_array($durationType, ['Half-Morning', 'Half-Afternoon']) || str_contains(strtolower($leaveType->name ?? ''), 'half');

        // Probation: all leave is LOP
        if ($user->isInProbation()) {
            $probationEnd = $user->probationEndDate();
            $totalDays    = $startDate->diffInDays($endDate) + 1;
            return [
                'actual_leave_days'      => $totalDays,
                'requested_working_days' => $totalDays,
                'sandwich_leave_days'    => 0,
                'penalty_lop_days'       => 0,
                'paid_casual_leave'      => 0,
                'paid_sick_leave'        => 0,
                'balance_lop_days'       => $totalDays,
                'total_lop_days'         => $totalDays,
                'is_unpaid'              => true,
                'has_lop'                => true,
                'is_partial'             => false,
                'unpaid_reason'          => "You are under probation. Paid benefits activate after " . Carbon::parse($probationEnd)->format('d M Y') . ".",
                'reasons'                => ["You are currently under probation. All leave is Unpaid (LOP)."],
                'is_probation'           => true,
                'probation_end_date'     => $probationEnd,
                'balance'                => $this->getBalancePreview($user, 0, 0),
            ];
        }

        // Load ALL configured holidays from DB (includes weekends stored as holidays,
        // company holidays, public holidays, festival holidays, etc.)
        $holidays        = Holiday::pluck('date')
                                  ->map(fn($d) => Carbon::parse($d)->format('Y-m-d'))
                                  ->toArray();
        $workingOverrides = WorkingDaysOverride::pluck('date')
                                  ->map(fn($d) => Carbon::parse($d)->format('Y-m-d'))
                                  ->toArray();

        $isWorkingDay = function (Carbon $date) use ($holidays, $workingOverrides): bool {
            $ds = $date->format('Y-m-d');
            if (in_array($ds, $workingOverrides)) return true;
            // A day is non-working if it is a weekend OR exists in the holiday table
            return !$date->isWeekend() && !in_array($ds, $holidays);
        };

        // ── Pre-scan: find first and last WORKING day in the leave range ───────
        // Sandwich leave only applies to non-working days that fall STRICTLY
        // BETWEEN two working leave days. Non-working days at the very start
        // or end of the leave block (with no working day before/after them in
        // the range) are NOT sandwich — they are just outside the leave block.
        //
        // Example: Leave Tue→Mon (Fri is holiday, Sat-Sun are weekend)
        //   Tue, Wed, Thu  → working     (before the non-working block)
        //   Fri, Sat, Sun  → non-working, BETWEEN Thu working and Mon working → sandwich
        //   Mon            → working
        //
        // Example: Leave Sat→Mon
        //   Sat, Sun → non-working, BEFORE the first working day (Mon) → NOT sandwich
        //   Mon      → working
        $firstWorkingDay = null;
        $lastWorkingDay  = null;
        $preScan = $startDate->copy()->startOfDay();
        while ($preScan->lte($endDate)) {
            if ($isWorkingDay($preScan)) {
                if ($firstWorkingDay === null) $firstWorkingDay = $preScan->copy();
                $lastWorkingDay = $preScan->copy();
            }
            $preScan->addDay();
        }

        // ── Day-by-day walk ─────────────────────────────────────────────────
        //
        // Phase 1 – 3-calendar-day advance-notice rule (CL only):
        //   eligibleFrom = today + 3 days (direct date comparison, no diff math).
        //   Working day before eligibleFrom → penalty LOP (late notice).
        //   Working day on/after eligibleFrom → eligible for paid CL.
        //
        // Phase 2 – Sandwich rule (higher priority):
        //   Non-working day strictly between firstWorkingDay and lastWorkingDay
        //   → sandwich LOP.
        //   If a sandwich follows a penalty working day, the NEXT eligible working
        //   day is also LOP (one-hop contamination).
        $eligibleFrom = $today->copy()->addDays(3)->startOfDay();

        $totalWorkingDays = 0;
        $sandwichDays     = 0;
        $penaltyDays      = 0;
        $eligibleDays     = 0;

        $lastWorkingWasPenalty    = false;
        $sandwichSinceLastPenalty = false;

        $current = $startDate->copy()->startOfDay();
        while ($current->lte($endDate)) {
            if ($isWorkingDay($current)) {
                $totalWorkingDays++;

                if ($isCasual) {
                    $directPenalty = $current->lt($eligibleFrom);

                    if ($directPenalty) {
                        $penaltyDays++;
                        $lastWorkingWasPenalty    = true;
                        $sandwichSinceLastPenalty = false;
                    } elseif ($lastWorkingWasPenalty && $sandwichSinceLastPenalty) {
                        // Sandwich contamination: eligible day dragged into LOP block.
                        $penaltyDays++;
                        $lastWorkingWasPenalty    = false;
                        $sandwichSinceLastPenalty = false;
                    } else {
                        $eligibleDays++;
                        $lastWorkingWasPenalty    = false;
                        $sandwichSinceLastPenalty = false;
                    }
                } else {
                    $eligibleDays++;
                }
            } elseif (
                $firstWorkingDay !== null &&
                $lastWorkingDay  !== null &&
                $current->gte($firstWorkingDay) &&
                $current->lte($lastWorkingDay)
            ) {
                // Non-working day BETWEEN the first and last working day → sandwich
                $sandwichDays++;
                if ($isCasual && $lastWorkingWasPenalty) {
                    $sandwichSinceLastPenalty = true;
                }
            }

            $current->addDay();
        }

        // External preceding sandwich days check - DISABLED
        // This was causing incorrect LOP calculations. Sandwich days should only be
        // non-working days WITHIN the current leave request period, not external gaps.
        $extPreSandwich = 0;

        $multiplier      = $isHalf ? 0.5 : 1.0;
        $baseWorkingDays = $totalWorkingDays * $multiplier;
        $penaltyLOP      = $penaltyDays      * $multiplier;
        $eligibleBase    = $eligibleDays     * $multiplier;

        \Log::debug("Leave calculation debug", [
            'user_id' => $user->id,
            'start_date' => $startDateStr,
            'end_date' => $endDateStr,
            'totalWorkingDays' => $totalWorkingDays,
            'penaltyDays' => $penaltyDays,
            'eligibleDays' => $eligibleDays,
            'sandwichDays' => $sandwichDays,
            'extPreSandwich' => $extPreSandwich,
            'baseWorkingDays' => $baseWorkingDays,
            'penaltyLOP' => $penaltyLOP,
            'eligibleBase' => $eligibleBase,
            'isCasual' => $isCasual,
        ]);

        $reasons    = [];
        $paidCL     = 0;
        $paidSL     = 0;
        $balanceLOP = 0;

        if ($isCasual) {
            $balance   = \App\Models\LeaveBalance::where('user_id', $user->id)->first();
            $clBalance = (($balance->casual_leave_balance ?? 0) + ($balance->cl_carry_forward ?? 0));

            // Paid CL is allocated only to eligible (non-penalized) working days
            $paidCL     = min($eligibleBase, $clBalance);
            $balanceLOP = max(0, $eligibleBase - $paidCL);

            \Log::debug("Casual leave balance calculation", [
                'user_id' => $user->id,
                'clBalance' => $clBalance,
                'eligibleBase' => $eligibleBase,
                'paidCL' => $paidCL,
                'balanceLOP' => $balanceLOP,
            ]);

            if ($penaltyDays > 0) {
                $reasons[] = "Applied less than 3 calendar days before the leave start date. {$penaltyLOP} working day(s) are Unpaid (LOP) due to late notice.";
            }
            if ($sandwichDays > 0) {
                $reasons[] = "Sandwich Leave Policy: {$sandwichDays} non-working day(s) (weekends/company holidays) between your leave dates are counted as Unpaid (LOP).";
            }
            if ($balanceLOP > 0) {
                $reasons[] = "Insufficient Casual Leave balance. {$balanceLOP} eligible working day(s) are Unpaid (LOP) due to exhausted balance.";
            }

        } elseif ($isSick) {
            $balance   = \App\Models\LeaveBalance::where('user_id', $user->id)->first();
            $slBalance = $balance->sick_leave_balance ?? 0;

            $paidSL     = min($eligibleBase, $slBalance);
            $balanceLOP = max(0, $eligibleBase - $paidSL);

            if ($sandwichDays > 0) {
                $reasons[] = "Sandwich Leave Policy: {$sandwichDays} non-working day(s) (weekends/company holidays) between your leave dates are counted as Unpaid (LOP).";
            }
            if ($balanceLOP > 0) {
                $reasons[] = "Insufficient Sick Leave balance. {$balanceLOP} working day(s) are Unpaid (LOP) due to exhausted balance.";
            }

        } else {
            $balanceLOP = $eligibleBase;
            $typeName   = $leaveType->name ?? 'This leave type';
            $reasons[]  = "{$typeName} does not have a paid balance. All {$baseWorkingDays} working day(s) will be Unpaid (LOP).";
            if ($sandwichDays > 0) {
                $reasons[] = "Sandwich Leave Policy: {$sandwichDays} non-working day(s) within the period are also Unpaid (LOP).";
            }
        }

        $totalLOP        = $penaltyLOP + $balanceLOP + $sandwichDays;
        $totalPaid       = $paidCL + $paidSL;
        $isUnpaid        = ($totalPaid == 0);
        $isPartial       = ($totalPaid > 0 && $totalLOP > 0);
        $actualLeaveDays = $baseWorkingDays + $sandwichDays;
        $statusText      = $isUnpaid
                           ? 'Unpaid Leave (LOP)'
                           : ($isPartial ? 'Partially Paid + LOP' : 'Paid Leave');

        return [
            'requested_working_days' => $baseWorkingDays,
            'sandwich_leave_days'    => $sandwichDays,
            'actual_leave_days'      => $actualLeaveDays,
            'penalty_lop_days'       => $penaltyLOP,
            'paid_casual_leave'      => $paidCL,
            'paid_sick_leave'        => $paidSL,
            'balance_lop_days'       => $balanceLOP,
            'total_lop_days'         => $totalLOP,
            'is_unpaid'              => $isUnpaid,
            'has_lop'                => $totalLOP > 0,
            'is_partial'             => $isPartial,
            'status_text'            => $statusText,
            'unpaid_reason'          => count($reasons) > 0 ? implode(' ', $reasons) : null,
            'reasons'                => $reasons,
            'is_probation'           => false,
            'balance'                => $this->getBalancePreview($user, $paidCL, $paidSL),
        ];
    }

    private function getBalancePreview($user, float $willDeductCL, float $willDeductSL): array
    {
        $balance = \App\Models\LeaveBalance::where('user_id', $user->id)->first();
        if (!$balance) return [];
        $cl  = $balance->casual_leave_balance ?? 0;
        $cf  = $balance->cl_carry_forward ?? 0;
        $sl  = $balance->sick_leave_balance ?? 0;
        return [
            'casual_leave'        => $cl,
            'cl_carry_forward'    => $cf,
            'sick_leave'          => $sl,
            'after_casual'        => max(0, ($cl + $cf) - $willDeductCL),
            'after_sick'          => max(0, $sl - $willDeductSL),
        ];
    }
    public function calculate(Request $request)
    {
        $request->validate([
            'leave_type_id' => 'required|exists:leave_types,id',
            'start_date'    => 'required|date',
            'end_date'      => 'required|date|after_or_equal:start_date',
            'user_id'       => 'nullable|exists:users,id',
        ]);

        $targetUser = $request->user();
        if ($request->has('user_id') && ($targetUser->hasRole('Super Admin') || $targetUser->hasRole('HR'))) {
            $targetUser = \App\Models\User::find($request->user_id) ?? $targetUser;
        }

        $overlap = LeaveRequest::where('user_id', $targetUser->id)
            ->whereIn('status', ['Pending', 'Approved'])
            ->where(function($q) use ($request) {
                $q->whereBetween('start_date', [$request->start_date, $request->end_date])
                  ->orWhereBetween('end_date', [$request->start_date, $request->end_date])
                  ->orWhere(function($sq) use ($request) {
                      $sq->where('start_date', '<=', $request->start_date)
                         ->where('end_date', '>=', $request->end_date);
                  });
            })
            ->first();

        if ($overlap) {
            return response()->json([
                'message' => 'You have already applied for leave on some dates within this range (' . $overlap->start_date . ' to ' . $overlap->end_date . ').'
            ], 422);
        }

        return response()->json(
            $this->calculateLeaveImpact(
                $targetUser,
                $request->leave_type_id,
                $request->start_date,
                $request->end_date,
                $request->duration_type ?? 'Full'
            )
        );
    }
    public function store(StoreLeaveRequest $request)
    {
        $user      = $request->user();
        $data      = $request->validated();

        $overlap = LeaveRequest::where('user_id', $user->id)
            ->whereIn('status', ['Pending', 'Approved'])
            ->where(function($q) use ($data) {
                $q->whereBetween('start_date', [$data['start_date'], $data['end_date']])
                  ->orWhereBetween('end_date', [$data['start_date'], $data['end_date']])
                  ->orWhere(function($sq) use ($data) {
                      $sq->where('start_date', '<=', $data['start_date'])
                         ->where('end_date', '>=', $data['end_date']);
                  });
            })
            ->first();

        if ($overlap) {
            return response()->json([
                'message' => 'You have already applied for leave on some dates within this range (' . $overlap->start_date . ' to ' . $overlap->end_date . ').'
            ], 422);
        }

        $leaveType = \App\Models\LeaveType::find($data['leave_type_id']);
        $durationType = $data['duration_type'] ?? 'Full';
        $impact    = $this->calculateLeaveImpact($user, $data['leave_type_id'], $data['start_date'], $data['end_date'], $durationType);
        $days      = $impact['actual_leave_days'];
        $isUnpaid  = $impact['is_unpaid'];
        $isSingleDay = ($data['start_date'] === $data['end_date']);
        $rawDays   = Carbon::parse($data['start_date'])->diffInDays(Carbon::parse($data['end_date'])) + 1;

        $balance = LeaveBalance::where('user_id', $user->id)->first();
        if (!$balance) {
            return response()->json(['message' => 'Leave balance record not found'], 400);
        }

        // Use granular paid amounts from impact calculation
        $paidCL    = $impact['paid_casual_leave'] ?? 0;
        $paidSL    = $impact['paid_sick_leave']   ?? 0;
        $totalLOP  = $impact['total_lop_days']    ?? 0;

        // Determine workflow statuses
        $tlStatus    = 'Pending';
        $adminStatus = 'Not Required';

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

        $leaveRequest = null;
        DB::beginTransaction();
        try {
            // Balance is NOT deducted at submission — it is deducted when the leave
            // is fully approved. Paid amounts are stored here so the approval step
            // knows exactly how many days to deduct (carry-forward first, then current).
            $leaveRequest = LeaveRequest::create([
                'user_id'                => $user->id,
                'leave_type_id'          => $data['leave_type_id'],
                'start_date'             => $data['start_date'],
                'end_date'               => $data['end_date'],
                'days'                   => $days,
                'reason'                 => $data['reason'],
                'attachment_link'        => $data['attachment_link'] ?? null,
                'status'                 => 'Pending',
                'tl_status'              => $tlStatus,
                'admin_status'           => $adminStatus,
                'is_unpaid'              => $isUnpaid,
                'unpaid_reason'          => $impact['unpaid_reason'],
                'sandwich_leave_days'    => $impact['sandwich_leave_days'],
                'actual_leave_days'      => $days,
                'paid_casual_leave'      => $paidCL,
                'paid_sick_leave'        => $paidSL,
                'lop_days'               => $totalLOP,
            ]);
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => $e->getMessage() ?: 'Failed to apply leave',
                'error'   => $e->getMessage()
            ], 500);
        }

        // Run sandwich LOP check OUTSIDE the transaction so a failure here
        // never rolls back the actual leave submission.
        try {
            $this->checkForSandwichLopConversion($leaveRequest);
        } catch (\Exception $e) {
            // Log but don't fail — leave is already created
            \Log::warning('checkForSandwichLopConversion failed: ' . $e->getMessage());
        }

        // Send in-app notifications outside the transaction
        $this->notifyOnSubmit($user, $leaveRequest, $leaveType);

        // Send email notifications (isolated, failures don't affect leave creation)
        try {
            \App\Services\Email\EmailService::sendLeaveRequestEmail($leaveRequest);
        } catch (\Exception $e) {
            \Log::warning('Email notification failed for leave request: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Leave applied successfully',
            'data'    => $leaveRequest
        ], 201);
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
        // Load relations to ensure they're available
        $leaveRequest->load(['user', 'leaveType']);

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

        try {
            DB::beginTransaction();

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

                // No balance change on rejection — balance is only deducted at approval,
                // so there is nothing to refund here.

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
                    // Deduct leave balance when fully approved
                    try {
                        $balance = LeaveBalance::where('user_id', $leaveRequest->user_id)->first();
                        $leaveTypeName = $leaveRequest->leaveType?->name ?? 'Unknown';
                        $daysToDeduct = floatval($leaveRequest->days_taken ?? $leaveRequest->days ?? 0);

                        \Log::info("Balance deduction: user={$leaveRequest->user_id}, type={$leaveTypeName}, days={$daysToDeduct}, is_unpaid={$leaveRequest->is_unpaid}");

                        if ($balance) {
                            if (stripos($leaveTypeName, 'Casual') !== false) {
                                // Casual Leave: consume carry-forward first, then current year
                                $carryForward = floatval($balance->cl_carry_forward ?? 0);
                                \Log::info("Before CL deduction: balance={$balance->casual_leave_balance}, cf={$carryForward}");

                                if ($carryForward >= $daysToDeduct) {
                                    $balance->cl_carry_forward -= $daysToDeduct;
                                } else {
                                    $balance->cl_carry_forward = 0;
                                    $balance->casual_leave_balance -= ($daysToDeduct - $carryForward);
                                }

                                \Log::info("After CL deduction: balance={$balance->casual_leave_balance}, cf={$balance->cl_carry_forward}");
                            } elseif (stripos($leaveTypeName, 'Sick') !== false) {
                                // Sick Leave
                                \Log::info("Before SL deduction: balance={$balance->sick_leave_balance}");
                                $balance->sick_leave_balance -= $daysToDeduct;
                                \Log::info("After SL deduction: balance={$balance->sick_leave_balance}");
                            }

                            $balance->total_leaves_taken = ($balance->total_leaves_taken ?? 0) + $daysToDeduct;
                            $balance->save();
                            \Log::info("Balance saved successfully");
                        } else {
                            \Log::warning("Balance record not found for user {$leaveRequest->user_id}");
                        }
                    } catch (\Exception $balErr) {
                        \Log::error('Balance update failed: ' . $balErr->getMessage(), ['trace' => $balErr->getTraceAsString()]);
                    }

                    // Try to notify but don't fail if it fails
                    try {
                        $this->notifyEmployee($leaveRequest, $user, 'approved');
                    } catch (\Exception $e) {
                        \Log::warning('Notification failed: ' . $e->getMessage());
                    }
                }
            }

            DB::commit();

            return response()->json([
                'message' => "Leave request {$status} successfully",
                'data'    => $leaveRequest
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Leave approval error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'leave_id' => $leaveRequest->id ?? null,
                'user_id' => $user->id ?? null
            ]);
            return response()->json(['message' => $e->getMessage() ?: 'Failed to update leave request'], 500);
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
            'start_date'        => 'required|date',
            'end_date'          => 'required|date|after_or_equal:start_date',
            'paid_casual_leave' => 'required|numeric|min:0',
            'paid_sick_leave'   => 'required|numeric|min:0',
            'lop_days'          => 'required|numeric|min:0',
            'remarks'           => 'required|string|max:500',
        ]);

        $newPaidCL = floatval($request->paid_casual_leave);
        $newPaidSL = floatval($request->paid_sick_leave);
        $newLop    = floatval($request->lop_days);
        $newActualDays = $newPaidCL + $newPaidSL + $newLop;

        DB::beginTransaction();
        try {
            $balance = LeaveBalance::where('user_id', $leaveRequest->user_id)->first();
            if (!$balance) {
                return response()->json(['message' => 'Leave balance record not found'], 400);
            }

            // Calculate auto-impact for the new dates (to capture auto sandwich days, etc.)
            $impact = $this->calculateLeaveImpact($leaveRequest->user, $leaveRequest->leave_type_id, $request->start_date, $request->end_date);

            // Audit Trail
            $previousValue = [
                'start_date'          => $leaveRequest->start_date,
                'end_date'            => $leaveRequest->end_date,
                'days'                => $leaveRequest->days,
                'actual_leave_days'   => $leaveRequest->actual_leave_days,
                'paid_casual_leave'   => $leaveRequest->paid_casual_leave ?? 0,
                'paid_sick_leave'     => $leaveRequest->paid_sick_leave ?? 0,
                'lop_days'            => $leaveRequest->lop_days ?? ($leaveRequest->is_unpaid ? $leaveRequest->actual_leave_days : 0),
                'sandwich_leave_days' => $leaveRequest->sandwich_leave_days,
            ];

            $newValue = [
                'start_date'          => $request->start_date,
                'end_date'            => $request->end_date,
                'days'                => $newActualDays,
                'actual_leave_days'   => $newActualDays,
                'paid_casual_leave'   => $newPaidCL,
                'paid_sick_leave'     => $newPaidSL,
                'lop_days'            => $newLop,
                'sandwich_leave_days' => $impact['sandwich_leave_days'],
            ];

            // 1. If previously Approved, refund the old deducted balances
            if ($leaveRequest->status === 'Approved') {
                $oldPaidCL = $leaveRequest->paid_casual_leave ?? 0;
                $oldPaidSL = $leaveRequest->paid_sick_leave ?? 0;

                $balance->casual_leave_balance += $oldPaidCL;
                $balance->sick_leave_balance   += $oldPaidSL;
                $balance->total_leaves_taken   -= $leaveRequest->actual_leave_days ?? $leaveRequest->days;
            }

            // 2. Deduct new balances
            if ($newPaidCL > 0) {
                $carryForward = $balance->cl_carry_forward ?? 0;
                if ($carryForward > 0) {
                    $fromCF = min($newPaidCL, $carryForward);
                    $balance->cl_carry_forward     -= $fromCF;
                    $balance->casual_leave_balance -= max(0, $newPaidCL - $fromCF);
                } else {
                    $balance->casual_leave_balance -= $newPaidCL;
                }
            }
            if ($newPaidSL > 0) {
                $balance->sick_leave_balance -= $newPaidSL;
            }
            $balance->total_leaves_taken += $newActualDays;
            $balance->save();

            // Create Audit Log
            LeaveAuditLog::create([
                'leave_request_id' => $leaveRequest->id,
                'modified_by'      => $user->id,
                'previous_value'   => $previousValue,
                'new_value'        => $newValue,
                'remarks'          => $request->remarks,
            ]);

            // 3. Update Leave Request (forces Status => Approved)
            $isUnpaid = ($newPaidCL == 0 && $newPaidSL == 0);
            $leaveRequest->update([
                'start_date'          => $request->start_date,
                'end_date'            => $request->end_date,
                'days'                => $newActualDays,
                'actual_leave_days'   => $newActualDays,
                'paid_casual_leave'   => $newPaidCL,
                'paid_sick_leave'     => $newPaidSL,
                'lop_days'            => $newLop,
                'is_unpaid'           => $isUnpaid,
                'unpaid_reason'       => $newLop > 0 ? "Overridden LOP: {$newLop} day(s)" : null,
                'sandwich_leave_days' => $impact['sandwich_leave_days'],
                'status'              => 'Approved',
                'admin_status'        => 'Approved',
                'approved_by'         => $user->id,
            ]);

            DB::commit();

            try {
                $this->notifyEmployee($leaveRequest, $user, 'approved');
            } catch (\Exception $ne) {
                // Ignore notification errors
            }

            return response()->json([
                'message' => 'Leave request overridden successfully.',
                'data'    => $leaveRequest
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to override leave request', 'error' => $e->getMessage()], 500);
        }
    }

    private function checkForSandwichLopConversion(LeaveRequest $newRequest)
    {
        $startDate = Carbon::parse($newRequest->start_date);
        $checkPre = $startDate->copy()->subDay()->startOfDay();

        $holidays = Holiday::pluck('date')
            ->map(fn($d) => Carbon::parse($d)->format('Y-m-d'))
            ->toArray();
        $workingOverrides = WorkingDaysOverride::pluck('date')
            ->map(fn($d) => Carbon::parse($d)->format('Y-m-d'))
            ->toArray();

        $isWorkingDay = function (Carbon $date) use ($holidays, $workingOverrides): bool {
            $ds = $date->format('Y-m-d');
            if (in_array($ds, $workingOverrides)) return true;
            if ($date->isWeekend()) return false;
            return !in_array($ds, $holidays);
        };

        $newDuration = $newRequest->duration_type ?? 'Full';

        // 1. Check preceding weekend/holidays (e.g. newRequest is on Monday)
        if (in_array($newDuration, ['Full', 'Half-Morning'])) {
            $preCount = 0;
            while (!$isWorkingDay($checkPre) && $preCount < 15) {
                $preCount++;
                $checkPre->subDay();
            }

            if ($preCount > 0) {
                $preRequest = LeaveRequest::where('user_id', $newRequest->user_id)
                    ->where('status', 'Approved')
                    ->where('start_date', '<=', $checkPre->toDateString())
                    ->where('end_date', '>=', $checkPre->toDateString())
                    ->where(function ($q) {
                        $q->where('paid_casual_leave', '>', 0)
                          ->orWhere('paid_sick_leave', '>', 0);
                    })
                    ->where(function ($q) use ($checkPre) {
                        $q->where('end_date', '>', $checkPre->toDateString())
                          ->orWhereHas('leaveType', function ($sq) {
                              $sq->where('name', 'NOT LIKE', '%Morning%');
                          });
                    })
                    ->first();

                if ($preRequest) {
                    $preRequest->update([
                        'pending_lop_conversion'   => true,
                        'lop_conversion_source_id' => $newRequest->id,
                    ]);
                }
            }
        }

        // 2. Check succeeding weekend/holidays (e.g. newRequest is on Friday)
        if (in_array($newDuration, ['Full', 'Half-Afternoon'])) {
            $endDate = Carbon::parse($newRequest->end_date);
            $checkPost = $endDate->copy()->addDay()->startOfDay();
            $postCount = 0;
            while (!$isWorkingDay($checkPost) && $postCount < 15) {
                $postCount++;
                $checkPost->addDay();
            }

            if ($postCount > 0) {
                $postRequest = LeaveRequest::where('user_id', $newRequest->user_id)
                    ->where('status', 'Approved')
                    ->where('start_date', '<=', $checkPost->toDateString())
                    ->where('end_date', '>=', $checkPost->toDateString())
                    ->where(function ($q) {
                        $q->where('paid_casual_leave', '>', 0)
                          ->orWhere('paid_sick_leave', '>', 0);
                    })
                    ->where(function ($q) use ($checkPost) {
                        $q->where('start_date', '<', $checkPost->toDateString())
                          ->orWhereHas('leaveType', function ($sq) {
                              $sq->where('name', 'NOT LIKE', '%Afternoon%');
                          });
                    })
                    ->first();

                if ($postRequest) {
                    $postRequest->update([
                        'pending_lop_conversion'   => true,
                        'lop_conversion_source_id' => $newRequest->id,
                    ]);
                }
            }
        }
    }

    public function confirmLopConversion(Request $request, LeaveRequest $leaveRequest)
    {
        $user = $request->user();
        if (!$user->hasRole('Super Admin') && !$user->hasRole('HR')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if (!$leaveRequest->pending_lop_conversion) {
            return response()->json(['message' => 'This request does not have a pending LOP conversion.'], 400);
        }

        DB::beginTransaction();
        try {
            $balance = \App\Models\LeaveBalance::where('user_id', $leaveRequest->user_id)->first();
            if ($balance) {
                $oldPaidCL = $leaveRequest->paid_casual_leave ?? 0;
                $oldPaidSL = $leaveRequest->paid_sick_leave ?? 0;

                $balance->casual_leave_balance += $oldPaidCL;
                $balance->sick_leave_balance   += $oldPaidSL;
                $balance->save();
            }

            LeaveAuditLog::create([
                'leave_request_id' => $leaveRequest->id,
                'modified_by'      => $user->id,
                'previous_value'   => [
                    'paid_casual_leave' => $leaveRequest->paid_casual_leave,
                    'paid_sick_leave'   => $leaveRequest->paid_sick_leave,
                    'lop_days'          => $leaveRequest->lop_days,
                    'is_unpaid'         => $leaveRequest->is_unpaid,
                ],
                'new_value'        => [
                    'paid_casual_leave' => 0,
                    'paid_sick_leave'   => 0,
                    'lop_days'          => $leaveRequest->actual_leave_days ?? $leaveRequest->days,
                    'is_unpaid'         => true,
                ],
                'remarks'          => 'Confirmed LOP conversion due to sandwich leave policy.',
            ]);

            $leaveRequest->update([
                'paid_casual_leave'        => 0,
                'paid_sick_leave'          => 0,
                'lop_days'                 => $leaveRequest->actual_leave_days ?? $leaveRequest->days,
                'is_unpaid'                => true,
                'unpaid_reason'            => 'Converted to LOP due to sandwich leave policy.',
                'pending_lop_conversion'   => false,
                'lop_conversion_source_id' => null,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'LOP conversion confirmed successfully.',
                'data'    => $leaveRequest
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to confirm LOP conversion', 'error' => $e->getMessage()], 500);
        }
    }

    // Admin-initiated leave creation for any employee
    public function storeForEmployee(\App\Http\Requests\StoreAdminLeaveRequest $request)
    {
        \Log::info('=== LEAVE CREATION START ===');
        \Log::info('Request data received', ['all' => $request->all()]);

        try {
            $data = $request->validated();
            \Log::info('Validation passed', ['data' => $data]);
        } catch (\Exception $ve) {
            \Log::error('Validation failed', ['error' => $ve->getMessage()]);
            return response()->json(['message' => 'Validation error: ' . $ve->getMessage(), 'error' => $ve->getMessage()], 422);
        }

        $admin = $request->user();
        \Log::info('Admin user', ['admin_id' => $admin->id ?? null]);

        $targetUser = User::find($data['user_id']);
        \Log::info('Target user lookup', ['target_id' => $data['user_id'], 'found' => $targetUser ? 'yes' : 'no']);

        if (!$targetUser) {
            return response()->json(['message' => 'Employee not found.'], 404);
        }

        // Check for overlapping leaves
        $overlap = LeaveRequest::where('user_id', $targetUser->id)
            ->whereIn('status', ['Pending', 'Approved'])
            ->where(function($q) use ($data) {
                $q->whereBetween('start_date', [$data['start_date'], $data['end_date']])
                  ->orWhereBetween('end_date', [$data['start_date'], $data['end_date']])
                  ->orWhere(function($sq) use ($data) {
                      $sq->where('start_date', '<=', $data['start_date'])
                         ->where('end_date', '>=', $data['end_date']);
                  });
            })
            ->first();

        if ($overlap) {
            return response()->json([
                'message' => 'Employee already has leave on some dates within this range (' . $overlap->start_date . ' to ' . $overlap->end_date . ').'
            ], 422);
        }

        $durationType = $data['duration_type'] ?? 'Full';
        $impact = $this->calculateLeaveImpact($targetUser, $data['leave_type_id'], $data['start_date'], $data['end_date'], $durationType);
        $days = $impact['actual_leave_days'];
        $isUnpaid = $impact['is_unpaid'];

        $balance = LeaveBalance::where('user_id', $targetUser->id)->first();
        if (!$balance) {
            return response()->json(['message' => 'Leave balance record not found for employee.'], 400);
        }

        // Admin-created leaves are always LOP (non-paid)
        $paidCL = 0;
        $paidSL = 0;
        $totalLOP = $days;

        $leaveRequest = null;
        DB::beginTransaction();
        try {
            $leaveRequest = LeaveRequest::create([
                'user_id'                => $targetUser->id,
                'leave_type_id'          => $data['leave_type_id'],
                'start_date'             => $data['start_date'],
                'end_date'               => $data['end_date'],
                'days'                   => $days,
                'reason'                 => $data['reason'] . ' [Admin-initiated LOP]',
                'attachment_link'        => $data['attachment_link'] ?? null,
                'status'                 => 'Approved',
                'tl_status'              => 'Not Required',
                'admin_status'           => 'Approved',
                'is_unpaid'              => true,
                'unpaid_reason'          => 'Admin-initiated leave (non-paid)',
                'sandwich_leave_days'    => 0,
                'actual_leave_days'      => $days,
                'paid_casual_leave'      => 0,
                'paid_sick_leave'        => 0,
                'lop_days'               => $totalLOP,
                'approver_id'            => $admin->id,
            ]);

            // Log audit entry for admin-initiated LOP
            LeaveBalance::createAuditLog($targetUser->id, $data['leave_type_id'], $totalLOP, 'Admin-initiated LOP leave (non-paid)', $admin->id);

            DB::commit();

            return response()->json([
                'message' => 'Leave created successfully' . ($autoApprove ? ' and auto-approved.' : '.'),
                'data'    => new \App\Http\Resources\LeaveRequestResource($leaveRequest)
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Leave creation failed', [
                'user_id' => $data['user_id'] ?? null,
                'leave_type_id' => $data['leave_type_id'] ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Failed to create leave: ' . $e->getMessage(),
                'error' => $e->getMessage(),
                'debug' => config('app.debug') ? $e->getTraceAsString() : null
            ], 500);
        }
    }

    public function rejectLopConversion(Request $request, LeaveRequest $leaveRequest)
    {
        $user = $request->user();
        if (!$user->hasRole('Super Admin') && !$user->hasRole('HR')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if (!$leaveRequest->pending_lop_conversion) {
            return response()->json(['message' => 'This request does not have a pending LOP conversion.'], 400);
        }

        $leaveRequest->update([
            'pending_lop_conversion'   => false,
            'lop_conversion_source_id' => null,
        ]);

        return response()->json([
            'message' => 'LOP conversion declined. Leave remains Paid.',
            'data'    => $leaveRequest
        ]);
    }
}
