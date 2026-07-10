<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\User;
use App\Models\LeaveRequest;
use App\Models\LeaveBalance;
use App\Models\WfhRequest;
use Carbon\Carbon;

class ReportController extends Controller
{
    public function employees(Request $request): JsonResponse
    {
        // Load all active users for employee report (don't filter by joining_date)
        $query = User::with(['team.teamLead', 'roles', 'leaveBalance'])->where('status', 'Active');

        if ($request->filled('user_id') && $request->user_id !== 'all') {
            $userId = intval($request->user_id);
            \Log::info('Employee report for single user', ['user_id' => $userId]);
            $query->where('id', $userId);
        } else {
            \Log::info('Employee report for all users');
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('team_id')) {
            $query->where('team_id', intval($request->team_id));
        }

        $currentYear = Carbon::now()->year;
        $currentMonth = Carbon::now()->month;
        $employees = $query->orderBy('first_name')->get();

        \Log::info('Employees loaded for report', [
            'count' => $employees->count(),
            'first_employee' => $employees->first()?->first_name ?? 'none'
        ]);

        // Batch load all leave and WFH data for better performance
        $employeeIds = $employees->pluck('id')->toArray();

        // Aggregate leave counts per employee (avoids N+1 queries)
        $leaveStats = LeaveRequest::whereIn('user_id', $employeeIds)
            ->where('status', 'Approved')
            ->get()
            ->groupBy('user_id')
            ->map(fn($requests) => [
                'year' => $requests->whereYear('start_date', $currentYear)->sum('actual_leave_days'),
                'month' => $requests->whereYear('start_date', $currentYear)->whereMonth('start_date', $currentMonth)->sum('actual_leave_days'),
            ]);

        $leaveCountStats = LeaveRequest::whereIn('user_id', $employeeIds)
            ->get()
            ->groupBy('user_id')
            ->map(fn($requests) => [
                'pending' => $requests->where('status', 'Pending')->count(),
                'approved' => $requests->where('status', 'Approved')->count(),
                'rejected' => $requests->where('status', 'Rejected')->count(),
                'lop' => $requests->where('status', 'Approved')->sum('lop_days'),
            ]);

        // Aggregate WFH counts per employee
        $wfhStats = WfhRequest::whereIn('user_id', $employeeIds)
            ->where('status', 'Approved')
            ->get()
            ->groupBy('user_id')
            ->map(fn($requests) => [
                'month' => $requests->whereYear('start_date', $currentYear)->whereMonth('start_date', $currentMonth)->count(),
                'year' => $requests->whereYear('start_date', $currentYear)->count(),
            ]);

        $employees = $employees->map(function (User $emp) use ($currentYear, $currentMonth, $leaveStats, $leaveCountStats, $wfhStats) {
            $balance = $emp->leaveBalance;
            $probationEnd = $emp->probationEndDate();
            $isInProbation = $emp->isInProbation();

            // Service duration
            $joining = $emp->joining_date ? Carbon::parse($emp->joining_date) : null;
            $serviceDays = $joining ? $joining->diffInDays(Carbon::today()) : 0;
            $serviceYears = $joining ? $joining->diffInYears(Carbon::today()) : 0;

            // DOB / Age
            $age = $emp->dob ? Carbon::parse($emp->dob)->age : null;

            // Use pre-aggregated data instead of individual queries
            $leavesTakenThisYear = $leaveStats[$emp->id]['year'] ?? 0;
            $leavesTakenThisMonth = $leaveStats[$emp->id]['month'] ?? 0;
            $pendingLeaves = $leaveCountStats[$emp->id]['pending'] ?? 0;
            $approvedLeaves = $leaveCountStats[$emp->id]['approved'] ?? 0;
            $rejectedLeaves = $leaveCountStats[$emp->id]['rejected'] ?? 0;
            $lopCount = $leaveCountStats[$emp->id]['lop'] ?? 0;
            $wfhThisMonth = $wfhStats[$emp->id]['month'] ?? 0;
            $wfhThisYear = $wfhStats[$emp->id]['year'] ?? 0;

            $clCarryForward = $balance ? ($balance->cl_carry_forward ?? 0) : 0;
            $clBalance      = $balance ? ($balance->casual_leave_balance ?? 0) : 0;
            $slBalance      = $balance ? ($balance->sick_leave_balance ?? 0) : 0;

            return [
                'id'                      => $emp->id,
                'employee_code'           => $emp->employee_code,
                'first_name'              => $emp->first_name,
                'last_name'               => $emp->last_name,
                'full_name'               => "{$emp->first_name} {$emp->last_name}",
                'gender'                  => $emp->gender,
                'dob'                     => $emp->dob,
                'age'                     => $age,
                'marital_status'          => $emp->marital_status,
                'blood_group'             => $emp->blood_group,
                'team'                    => $emp->team?->name,
                'team_lead'               => $emp->team?->teamLead ? "{$emp->team->teamLead->first_name} {$emp->team->teamLead->last_name}" : null,
                'designation'             => $emp->designation,
                'joining_date'            => $emp->joining_date,
                'probation_end_date'      => $probationEnd,
                'is_in_probation'         => $isInProbation,
                'service_days'            => $serviceDays,
                'service_years'           => $serviceYears,
                'email'                   => $emp->email,
                'personal_email'          => $emp->personal_email,
                'contact_number'          => $emp->contact_number,
                'alternate_contact_number'=> $emp->alternate_contact_number,
                'current_address'         => $emp->current_address,
                'permanent_address'       => $emp->permanent_address,
                'status'                  => $emp->status,
                'role'                    => $emp->roles->pluck('name')->first(),
                // Leave info
                'casual_leave_balance'    => $clBalance,
                'sick_leave_balance'      => $slBalance,
                'cl_carry_forward'        => $clCarryForward,
                'total_cl_available'      => $clBalance + $clCarryForward,
                'total_sl_available'      => $slBalance,
                'leaves_taken_this_month' => $leavesTakenThisMonth,
                'leaves_taken_this_year'  => $leavesTakenThisYear,
                'pending_leaves'          => $pendingLeaves,
                'approved_leaves'         => $approvedLeaves,
                'rejected_leaves'         => $rejectedLeaves,
                'lop_count'               => $lopCount,
                'wfh_this_month'          => $wfhThisMonth,
                'wfh_this_year'           => $wfhThisYear,
            ];
        });

        return response()->json(['status' => 'success', 'data' => $employees]);
    }

    public function leaves(Request $request): JsonResponse
    {
        $query = LeaveRequest::with(['user.team', 'leaveType', 'approver'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('user_id') && $request->user_id !== 'all') {
            $query->where('user_id', $request->user_id);
        }
        if ($request->filled('start_date')) {
            $query->where('start_date', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->where('end_date', '<=', $request->end_date);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $leaves = $query->get()->map(function (LeaveRequest $req) {
            return [
                'id'                   => $req->id,
                'employee_code'        => $req->user?->employee_code,
                'employee_name'        => "{$req->user?->first_name} {$req->user?->last_name}",
                'team'                 => $req->user?->team?->name,
                'leave_type'           => $req->leaveType?->name,
                'start_date'           => $req->start_date,
                'end_date'             => $req->end_date,
                'requested_days'       => $req->actual_leave_days - ($req->sandwich_leave_days ?? 0),
                'sandwich_days'        => $req->sandwich_leave_days ?? 0,
                'total_days'           => $req->actual_leave_days,
                'is_unpaid'            => $req->is_unpaid,
                'paid_status'          => $req->is_unpaid ? 'Unpaid (LOP)' : 'Paid',
                'status'               => $req->status,
                'tl_status'            => $req->tl_status,
                'admin_status'         => $req->admin_status,
                'reason'               => $req->reason,
                'applied_date'         => $req->created_at?->toDateString(),
                'approved_by'          => $req->approver ? "{$req->approver->first_name} {$req->approver->last_name}" : null,
                'approval_date'        => $req->updated_at?->toDateString(),
                'remarks'              => $req->remarks,
            ];
        });

        return response()->json(['status' => 'success', 'data' => $leaves]);
    }

    public function leaveBalances(Request $request): JsonResponse
    {
        try {
            $query = User::with(['team', 'leaveBalance'])
                ->where('status', 'Active');

            if ($request->filled('user_id') && $request->user_id !== 'all') {
                $userId = intval($request->user_id);
                $query->where('id', $userId);
            }
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            $currentYear = Carbon::now()->year;
            $employees = $query->orderBy('first_name')->get();
            $employeeIds = $employees->pluck('id')->toArray();

            \Log::info('Leave balance report', [
                'employee_count' => $employees->count(),
                'currentYear' => $currentYear
            ]);

            // Batch-load leave requests with leave types
            $allLeaves = LeaveRequest::whereIn('user_id', $employeeIds)
                ->where('status', 'Approved')
                ->whereYear('start_date', $currentYear)
                ->with('leaveType')
                ->get()
                ->groupBy('user_id');

            // Batch-load WFH requests
            $allWfh = WfhRequest::whereIn('user_id', $employeeIds)
                ->where('status', 'Approved')
                ->whereYear('start_date', $currentYear)
                ->get()
                ->groupBy('user_id');

            $data = $employees->map(function (User $emp) use ($currentYear, $allLeaves, $allWfh) {
                $balance = $emp->leaveBalance;
                $cl      = $balance?->casual_leave_balance ?? 0;
                $sl      = $balance?->sick_leave_balance ?? 0;
                $cf      = $balance?->cl_carry_forward ?? 0;

                // Use pre-loaded data instead of individual queries
                $leaves = $allLeaves[$emp->id] ?? collect();
                $wfhs = $allWfh[$emp->id] ?? collect();

                $clUsed = $leaves->filter(fn($l) => !$l->is_unpaid && $l->leaveType?->name && str_contains($l->leaveType->name, 'Casual'))
                    ->sum('actual_leave_days');

                $slUsed = $leaves->filter(fn($l) => !$l->is_unpaid && $l->leaveType?->name && str_contains($l->leaveType->name, 'Sick'))
                    ->sum('actual_leave_days');

                $lop = $leaves->sum('lop_days');
                $wfh = $wfhs->count();

                return [
                    'id'               => $emp->id,
                    'employee_code'    => $emp->employee_code,
                    'full_name'        => "{$emp->first_name} {$emp->last_name}",
                    'team'             => $emp->team?->name,
                    'designation'      => $emp->designation,
                    'status'           => $emp->status,
                    'cl_balance'       => $cl,
                    'sl_balance'       => $sl,
                    'cl_carry_forward' => $cf,
                    'total_cl'         => $cl + $cf,
                    'total_sl'         => $sl,
                    'cl_used'          => $clUsed,
                    'sl_used'          => $slUsed,
                    'lop_count'        => $lop,
                    'wfh_count'        => $wfh,
                    'is_in_probation'  => $emp->isInProbation(),
                    'probation_end_date' => $emp->probationEndDate(),
                ];
            });

            return response()->json(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            \Log::error('Leave balance report error', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Error generating leave balance report: ' . $e->getMessage()], 500);
        }
    }

    public function allEmployeesForFilter(Request $request): JsonResponse
    {
        $employees = User::select('id', 'first_name', 'last_name', 'employee_code')
            ->where('status', 'Active')
            ->orderBy('first_name')
            ->get()
            ->map(fn($e) => ['id' => $e->id, 'name' => "{$e->first_name} {$e->last_name}", 'code' => $e->employee_code]);

        return response()->json(['data' => $employees]);
    }

    /**
     * Attendance Summary Report - Shows daily attendance with leave status for a given week
     * Returns data for all employees with their daily status and calculated late arrivals
     */
    public function attendanceSummary(Request $request): JsonResponse
    {
        try {
            $startDate = $request->input('start_date');
            $endDate = $request->input('end_date');

            if (!$startDate || !$endDate) {
                return response()->json(['message' => 'start_date and end_date required'], 422);
            }

            $start = Carbon::parse($startDate)->startOfDay();
            $end = Carbon::parse($endDate)->endOfDay();

            \Log::info('Attendance summary requested', ['start' => $startDate, 'end' => $endDate]);

        // Get all active employees
        $employees = User::where('status', 'Active')
            ->with(['team', 'leaveBalance'])
            ->orderBy('first_name')
            ->get();

        $employeeIds = $employees->pluck('id')->toArray();

        // BATCH LOAD all data upfront to avoid N+1 queries
        // This is critical for performance - loading data once for all employees and dates
        $allLeaves = LeaveRequest::whereIn('user_id', $employeeIds)
            ->where('status', 'Approved')
            ->where(function($q) use ($startDate, $endDate) {
                $q->whereBetween('start_date', [$startDate, $endDate])
                  ->orWhere(function($q2) use ($startDate, $endDate) {
                      $q2->whereDate('end_date', '>=', $startDate)
                         ->whereDate('start_date', '<=', $endDate);
                  });
            })
            ->get();

        $allWfh = WfhRequest::whereIn('user_id', $employeeIds)
            ->where('status', 'Approved')
            ->whereDate('end_date', '>=', $startDate)
            ->whereDate('start_date', '<=', $endDate)
            ->get();

        $allAttendance = \App\Models\Attendance::whereIn('user_id', $employeeIds)
            ->whereBetween('date', [$startDate, $endDate])
            ->get();

        // Log data loaded for debugging
        \Log::info('Attendance summary data loaded', [
            'employee_count' => $employees->count(),
            'attendance_records' => $allAttendance->count(),
            'leave_records' => $allLeaves->count(),
            'wfh_records' => $allWfh->count(),
            'date_range' => "$startDate to $endDate"
        ]);

        $report = [];
        $summaryStats = [
            'total_absent' => 0,
            'total_wfh' => 0,
            'total_half_day' => 0,
            'total_late' => 0,
            'total_present' => 0,
        ];

        foreach ($employees as $emp) {
            // Count leave types for this employee in the date range (supporting half-days as 0.5)
            $empLeaves = $allLeaves->filter(fn($l) => $l->user_id === $emp->id);

            // Calculate leave counts with proper half-day support (0.5 for half days)
            $clCount = 0;
            $slCount = 0;
            $lopCount = 0;
            $wfhCount = 0;

            foreach ($empLeaves as $leave) {
                $isHalfDay = $leave->duration_type && strpos($leave->duration_type, 'Half') !== false;
                $leaveValue = $isHalfDay ? 0.5 : 1;

                if ($leave->is_unpaid) {
                    $lopCount += $leaveValue;
                } elseif ($leave->leaveType && str_contains($leave->leaveType->name ?? '', 'Casual')) {
                    $clCount += $leaveValue;
                } elseif ($leave->leaveType && str_contains($leave->leaveType->name ?? '', 'Sick')) {
                    $slCount += $leaveValue;
                }
            }

            // Calculate WFH count with half-day support
            $empWfh = $allWfh->filter(fn($w) => $w->user_id === $emp->id);
            foreach ($empWfh as $wfh) {
                $isHalfDay = $wfh->duration_type && strpos($wfh->duration_type, 'Half') !== false;
                $wfhCount += $isHalfDay ? 0.5 : 1;
            }

            $empData = [
                'id' => $emp->id,
                'employee_code' => $emp->employee_code,
                'name' => "{$emp->first_name} {$emp->last_name}",
                'team' => $emp->team?->name,
                'cl_count' => round($clCount, 1),
                'sl_count' => round($slCount, 1),
                'lop_count' => round($lopCount, 1),
                'wfh_count' => round($wfhCount, 1),
                'daily_status' => [],
            ];

            // Process each day in the date range
            $current = clone $start;
            $dayStats = ['absent' => 0, 'wfh' => 0, 'half_day' => 0, 'late' => 0, 'present' => 0, 'present_count' => 0, 'late_count' => 0];

            while ($current <= $end) {
                $dateStr = $current->toDateString();
                $currentDate = $current->clone();

                // Get data from pre-loaded collections (no DB queries)
                $leave = $allLeaves->first(function($l) use ($emp, $dateStr) {
                    $lStart = is_string($l->start_date) ? $l->start_date : $l->start_date->toDateString();
                    $lEnd = is_string($l->end_date) ? $l->end_date : $l->end_date->toDateString();
                    return $l->user_id === $emp->id && $lStart <= $dateStr && $lEnd >= $dateStr;
                });

                $wfh = $allWfh->first(function($w) use ($emp, $dateStr) {
                    $wStart = is_string($w->start_date) ? $w->start_date : $w->start_date->toDateString();
                    $wEnd = is_string($w->end_date) ? $w->end_date : $w->end_date->toDateString();
                    return $w->user_id === $emp->id && $wStart <= $dateStr && $wEnd >= $dateStr;
                });

                $attendance = $allAttendance->first(function($a) use ($emp, $dateStr) {
                    $aDate = is_string($a->date) ? $a->date : $a->date->toDateString();
                    return $a->user_id === $emp->id && $aDate === $dateStr;
                });

                $dayStatus = $this->calculateDayStatus($emp->id, $dateStr, $leave, $wfh, $attendance);

                $empData['daily_status'][] = [
                    'date' => $dateStr,
                    'day_name' => $current->format('D'),
                    'status' => $dayStatus['status'],
                    'leave_type' => $dayStatus['leave_type'] ?? null,
                    'is_late' => $dayStatus['is_late'],
                    'check_in' => $attendance?->check_in,
                    'check_out' => $attendance?->check_out,
                ];

                // Update daily stats
                if ($dayStatus['status'] === 'A') $dayStats['absent']++;
                elseif ($dayStatus['status'] === 'W') $dayStats['wfh']++;
                elseif ($dayStatus['status'] === 'H') $dayStats['half_day']++;
                elseif ($dayStatus['is_late']) {
                    $dayStats['late']++;
                    $dayStats['late_count']++;
                } elseif ($dayStatus['status'] === 'P') {
                    $dayStats['present']++;
                    $dayStats['present_count']++;
                }

                $current->addDay();
            }

            $empData['summary'] = $dayStats;
            $empData['p_count'] = $dayStats['present_count'];
            $empData['l_count'] = $dayStats['late_count'];
            $empData['total_leaves'] = round($clCount + $slCount + $lopCount, 1);
            $report[] = $empData;

            // Update summary stats
            $summaryStats['total_absent'] += $dayStats['absent'];
            $summaryStats['total_wfh'] += $dayStats['wfh'];
            $summaryStats['total_half_day'] += $dayStats['half_day'];
            $summaryStats['total_late'] += $dayStats['late'];
            $summaryStats['total_present'] += $dayStats['present'];
        }

            return response()->json([
                'status' => 'success',
                'period' => ['start_date' => $startDate, 'end_date' => $endDate],
                'summary' => $summaryStats,
                'data' => $report,
            ]);
        } catch (\Carbon\Exceptions\InvalidFormatException $e) {
            \Log::error('Invalid date format in attendance summary', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Invalid date format. Use YYYY-MM-DD.'], 422);
        } catch (\Exception $e) {
            \Log::error('Error generating attendance summary', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Error generating attendance summary: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Calculate day status for an employee
     * Returns: 'P' = Present, 'A' = Absent, 'L' = Leave, 'W' = WFH, 'H' = Half Day
     * is_late: true if employee is marked as late
     *
     * Late logic:
     * - Normal day or Half-day Afternoon: first punch-in after 9:45 AM = Late
     * - Half-day Morning: first punch-in after 2:30 PM = Late
     * - WFH: no late marking
     */
    private function calculateDayStatus($userId, $dateStr, $leave, $wfh, $attendance): array
    {
        $isLate = false;
        $leaveType = null;

        // If on leave
        if ($leave) {
            $isHalfDay = $leave->duration_type && strpos($leave->duration_type, 'Half') !== false;
            $isMorningHalf = $leave->duration_type && strpos($leave->duration_type, 'Half-Morning') !== false;

            // Generate leave type abbreviation
            if ($leave->leaveType) {
                $typeName = $leave->leaveType->name ?? '';

                if (str_contains($typeName, 'Casual')) {
                    $leaveType = $isHalfDay ? ($isMorningHalf ? 'CLHM' : 'CLHE') : 'CL';
                } elseif (str_contains($typeName, 'Sick')) {
                    $leaveType = $isHalfDay ? ($isMorningHalf ? 'SLHM' : 'SLHE') : 'SL';
                } else {
                    $leaveType = $isHalfDay ? 'HLF' : 'LV';
                }
            }

            // Check if it's an LOP (unpaid leave)
            if ($leave->is_unpaid) {
                $leaveType = 'LOP';
            }

            // For half-day leave (morning), check if employee checked in after 2:30 PM
            // Otherwise (full day leave, half-day afternoon), no late marking for leave days
            if ($isHalfDay && $isMorningHalf && $attendance && $attendance->check_in) {
                $checkInTime = Carbon::parse($attendance->check_in);
                $afternoonThreshold = Carbon::parse($dateStr . ' 14:30:00');

                if ($checkInTime->greaterThan($afternoonThreshold)) {
                    $isLate = true;
                }
            }

            return [
                'status' => $isHalfDay ? 'H' : 'L',
                'leave_type' => $leaveType,
                'is_late' => $isLate,
            ];
        }

        // If on WFH, mark as 'W' (no late marking for WFH)
        if ($wfh) {
            return [
                'status' => 'W',
                'leave_type' => 'WFH',
                'is_late' => false,
            ];
        }

        // No attendance record = Absent
        if (!$attendance) {
            return [
                'status' => 'A',
                'leave_type' => null,
                'is_late' => false,
            ];
        }

        // Check if late based on first check-in time (normal day)
        // Late threshold is 9:45 AM
        if ($attendance->check_in) {
            $checkInTime = Carbon::parse($attendance->check_in);
            $lateThreshold = Carbon::parse($dateStr . ' 09:45:00');

            if ($checkInTime->greaterThan($lateThreshold)) {
                $isLate = true;
            }
        }

        return [
            'status' => 'P',
            'leave_type' => null,
            'is_late' => $isLate,
        ];
    }

    public function todaysBirthdays(): JsonResponse
    {
        try {
            $today = Carbon::now();
            $todayMonth = $today->month;
            $todayDay = $today->day;

            // Fetch all active employees with birthdays today
            $birthdays = User::where('status', 'Active')
                ->whereNotNull('dob')
                ->where('dob', '!=', '')
                ->get()
                ->filter(function ($user) use ($todayMonth, $todayDay) {
                    $dob = Carbon::parse($user->dob);
                    return $dob->month === $todayMonth && $dob->day === $todayDay;
                })
                ->map(fn($user) => [
                    'id' => $user->id,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'profile_photo_path' => $user->profile_photo_path,
                ])
                ->values();

            return response()->json([
                'status' => 'success',
                'data' => $birthdays
            ]);
        } catch (\Exception $e) {
            \Log::error('Today\'s birthdays fetch error', ['error' => $e->getMessage()]);
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch birthdays'
            ], 500);
        }
    }
}
