<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Holiday;
use App\Models\Announcement;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Display the dashboard data for the authenticated user.
     */
    public function index(Request $request)
    {
        $user = $request->user()->load(['team:id,name', 'roles:id,name']);
        
        // 1. User Profile & Service Duration
        $joiningDate = $user->joining_date ? Carbon::parse($user->joining_date) : Carbon::parse($user->created_at);
        $serviceDuration = null;
        $serviceDays = null;
        $serviceStats = null;
        if ($joiningDate) {
            $diff = $joiningDate->diff(Carbon::now());
            $serviceDuration = "{$diff->y} Years {$diff->m} Months {$diff->d} Days";
            $serviceDays = $joiningDate->diffInDays(Carbon::now());
            $serviceStats = [
                'years' => $diff->y,
                'months' => $diff->m,
                'days' => $diff->d
            ];
        }

        $todayStr = Carbon::today('Asia/Kolkata')->toDateString();

        $activeRecognition = \App\Models\Recognition::where('user_id', $user->id)
            ->where('is_active', true)
            ->whereDate('start_date', '<=', $todayStr)
            ->whereDate('end_date', '>=', $todayStr)
            ->first();

        $profile = [
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'employee_code' => $user->employee_code,
            'designation' => $user->designation,
            'team' => $user->team->name ?? 'Unassigned',
            'service_duration' => $serviceDuration,
            'service_days' => $serviceDays,
            'service_stats' => $serviceStats,
            'active_recognition' => $activeRecognition,
            'profile_photo_path' => $user->profilePhotoUrl(),
        ];

        // Add Attendance Status
        $todayStr = Carbon::today('Asia/Kolkata')->toDateString();
        $todayAttendance = \App\Models\Attendance::where('user_id', $user->id)
            ->where('date', $todayStr)
            ->first();
        $profile['attendance_status'] = 'Not Punched In';
        $attendanceWidgetStatus = 'Not Checked In';
        
        if ($todayAttendance) {
            if ($todayAttendance->check_out_time) {
                $profile['attendance_status'] = 'Punched Out';
                $attendanceWidgetStatus = 'Checked Out';
            } else {
                $openBreak = $todayAttendance->breaks()->whereNull('break_end')->first();
                if ($openBreak) {
                    $profile['attendance_status'] = 'On Break';
                    $attendanceWidgetStatus = 'On Break';
                } else {
                    $profile['attendance_status'] = 'Punched In';
                    $attendanceWidgetStatus = 'Checked In';
                }
            }
        }

        $attendanceWidgetData = [
            'status' => $attendanceWidgetStatus,
            'attendance' => $todayAttendance ? new \App\Http\Resources\AttendanceResource($todayAttendance) : null
        ];

        // 2. Leave Metrics
        $currentYear = Carbon::now()->year;

        $balance = LeaveBalance::where('user_id', $user->id)->first();

        $casualLeaveBalance = $balance ? $balance->casual_leave_balance : 0;
        $sickLeaveBalance = $balance ? $balance->sick_leave_balance : 0;
        $clCarryForward = $balance ? ($balance->cl_carry_forward ?? 0) : 0;

        // Calculate total leaves available
        $clTotal = 12 + $clCarryForward;
        $slTotal = 12;

        // Calculate used leaves from remaining balance
        $casualLeaveTaken = max(0, $clTotal - $casualLeaveBalance);
        $sickLeaveTaken = max(0, $slTotal - $sickLeaveBalance);

        // Calculate carry-forward expiry date (Dec 31 of current year if CF exists)
        $cfExpiryDate = null;
        if ($clCarryForward > 0 && $balance && $balance->cl_carry_forward_year) {
            $cfExpiryDate = Carbon::create($balance->cl_carry_forward_year + 1, 12, 31)->toDateString();
        }

        $totalLeavesTaken = LeaveRequest::where('user_id', $user->id)
            ->where('status', 'Approved')
            ->sum('days') ?? 0;

        $pendingLeaves = LeaveRequest::where('user_id', $user->id)
            ->where('status', 'Pending')
            ->count();

        $employeesOnLeaveTodayRequests = LeaveRequest::with('user:id,first_name,last_name', 'leaveType:id,name')
            ->where('status', 'Approved')
            ->where('start_date', '<=', $todayStr)
            ->where('end_date', '>=', $todayStr)
            ->get();

        $employeesOnLeaveTodayList = $employeesOnLeaveTodayRequests->map(function ($req) {
            return [
                'name' => $req->user->first_name . ' ' . $req->user->last_name,
                'leave_type' => $req->leaveType ? $req->leaveType->name : 'Leave'
            ];
        });

        $leaveMetrics = [
            'cl_total' => $clTotal,
            'cl_used' => $casualLeaveTaken,
            'sl_total' => $slTotal,
            'sl_used' => $sickLeaveTaken,
            'cl_carry_forward' => max(0, $clCarryForward),
            'cf_expiry_date' => $cfExpiryDate,
            'casual_leave_balance' => max(0, $casualLeaveBalance),
            'sick_leave_balance' => max(0, $sickLeaveBalance),
            'total_leaves_taken' => max(0, $totalLeavesTaken),
            'pending_leaves' => $pendingLeaves,
            'employees_on_leave_today' => $employeesOnLeaveTodayRequests->count(),
            'employees_on_leave_today_list' => $employeesOnLeaveTodayList,
            'is_in_probation' => $user->isInProbation(),
            'probation_end_date' => $user->probationEndDate(),
        ];

        // 3. Widgets: Upcoming Holidays
        $upcomingHolidays = Holiday::where('date', '>=', Carbon::today('Asia/Kolkata'))
            ->orderBy('date', 'asc')
            ->take(5)
            ->get(['name', 'date']);

        // 4. Widgets: Latest Company Updates
        $latestUpdates = Announcement::where(function ($query) {
                $query->whereNull('expires_at')
                      ->orWhere('expires_at', '>', Carbon::now());
            })
            ->where(function ($query) {
                $query->whereNull('scheduled_at')
                      ->orWhere('scheduled_at', '<=', Carbon::now());
            })
            ->orderBy('is_pinned', 'desc')
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get(['title', 'category', 'created_at', 'is_pinned']);

        // 5. Celebrations (Birthdays & Anniversaries in next 14 days)
        // Note: Cache key includes date to auto-invalidate daily
        $cacheKey = 'dashboard_celebrations_' . Carbon::today('Asia/Kolkata')->toDateString();
        $celebrations = Cache::remember($cacheKey, now()->addHours(24), function () {
            $today = Carbon::today('Asia/Kolkata');
            $nextWeek = Carbon::today('Asia/Kolkata')->addDays(14);

            $allActiveUsers = User::where('status', 'Active')->get(['first_name', 'last_name', 'dob', 'joining_date']);

            $birthdays = [];
            $anniversaries = [];

            foreach ($allActiveUsers as $u) {
                if ($u->dob) {
                    $dobThisYear = Carbon::parse($u->dob)->setYear($today->year);
                    if ($dobThisYear->isBetween($today, $nextWeek)) {
                        $birthdays[] = [
                            'name' => "{$u->first_name} {$u->last_name}",
                            'date' => $dobThisYear->toDateString(),
                        ];
                    }
                }
                if ($u->joining_date) {
                    $joinThisYear = Carbon::parse($u->joining_date)->setYear($today->year);
                    $joinDateStr = Carbon::parse($u->joining_date)->toDateString();
                    // Only exclude if joining today (0 years service doesn't count)
                    if ($joinThisYear->isBetween($today, $nextWeek) && $joinDateStr !== $today->toDateString()) {
                        $anniversaries[] = [
                            'name' => "{$u->first_name} {$u->last_name}",
                            'date' => $joinThisYear->toDateString(),
                            'years' => $today->year - Carbon::parse($u->joining_date)->year,
                        ];
                    }
                }
            }

            usort($birthdays, fn($a, $b) => $a['date'] <=> $b['date']);
            usort($anniversaries, fn($a, $b) => $a['date'] <=> $b['date']);

            return ['birthdays' => $birthdays, 'anniversaries' => $anniversaries];
        });

        $birthdays = $celebrations['birthdays'];
        $anniversaries = $celebrations['anniversaries'];

        $upcomingDays = (int) (\App\Models\SystemSetting::where('key', 'upcoming_birthdays_days')->value('value') ?? 30);
        $upcomingBirthdays = [];
        
        $today = Carbon::today('Asia/Kolkata');
        $targetDate = Carbon::today('Asia/Kolkata')->addDays($upcomingDays);
        
        $fullUsers = User::with('team:id,name')->where('status', 'Active')->get(['id', 'first_name', 'last_name', 'dob', 'designation', 'team_id', 'profile_photo_path']);

        foreach ($fullUsers as $u) {
            if ($u->dob) {
                $dobThisYear = Carbon::parse($u->dob)->setYear($today->year);

                // If birthday has passed this year, check next year
                if ($dobThisYear->isBefore($today)) {
                    $dobThisYear->addYear();
                }

                if ($dobThisYear->between($today, $targetDate)) {
                    $daysRemaining = $today->diffInDays($dobThisYear);
                    $upcomingBirthdays[] = [
                        'id' => $u->id,
                        'name' => "{$u->first_name} {$u->last_name}",
                        'designation' => $u->designation,
                        'department' => $u->team ? $u->team->name : 'Unassigned',
                        'date' => $dobThisYear->toDateString(),
                        'days_remaining' => $daysRemaining,
                        'profile_photo_path' => $u->profilePhotoUrl(),
                    ];
                }
            }
        }
        
        usort($upcomingBirthdays, fn($a, $b) => $a['days_remaining'] <=> $b['days_remaining']);

        // 6. Charts: Leave usage by month for the current year
        $leaveRequests = LeaveRequest::where('user_id', $user->id)
            ->where('status', 'Approved')
            ->whereBetween('start_date', ["$currentYear-01-01", "$currentYear-12-31"])
            ->get(['start_date', 'days']);

        $monthlyLeaves = array_fill(1, 12, 0); // Initialize all months to 0
        foreach ($leaveRequests as $req) {
            $month = (int) Carbon::parse($req->start_date)->format('n');
            $monthlyLeaves[$month] += $req->days;
        }

        $chartData = [];
        for ($m = 1; $m <= 12; $m++) {
            $chartData[] = [
                'name' => Carbon::create()->month($m)->format('M'),
                'leaves' => $monthlyLeaves[$m]
            ];
        }

        // 7. Recent Activities
        $recentActivities = $request->user()->notifications()
            ->latest()
            ->take(6)
            ->get()
            ->map(function ($notification) {
                return [
                    'id' => $notification->id,
                    'type' => class_basename($notification->type),
                    'data' => $notification->data,
                    'created_at' => $notification->created_at,
                    'read_at' => $notification->read_at,
                ];
            });

        $responseData = [
            'profile' => $profile,
            'attendance_widget_data' => $attendanceWidgetData,
            'leave_metrics' => $leaveMetrics,
            'widgets' => [
                'upcoming_holidays' => $upcomingHolidays,
                'company_updates' => $latestUpdates,
                'birthdays' => $birthdays,
                'anniversaries' => $anniversaries,
                'upcoming_birthdays' => $upcomingBirthdays,
            ],
            'charts' => [
                'leaves_by_month' => $chartData
            ],
            'recent_activities' => $recentActivities,
        ];

        if ($user->hasRole('Super Admin') || $user->hasRole('Team Lead')) {
            $totalEmployees = User::where('status', 'Active')->count();
            $yesterdayStr = Carbon::yesterday()->toDateString();
            
            $presentToday = \App\Models\Attendance::where('date', $todayStr)->whereNotNull('check_in_time')->distinct('user_id')->count('user_id');
            $presentYesterday = \App\Models\Attendance::where('date', $yesterdayStr)->whereNotNull('check_in_time')->distinct('user_id')->count('user_id');
            
            $attendanceTrend = 0;
            if ($presentYesterday > 0) {
                $attendanceTrend = round((($presentToday - $presentYesterday) / $presentYesterday) * 100);
            }
            
            $onLeaveTodayRequests = LeaveRequest::with('user:id,first_name,last_name', 'leaveType:id,name')
                ->whereHas('leaveType', function ($query) {
                    $query->where('name', 'not like', '%Work From Home%')
                          ->where('name', 'not like', '%WFH%');
                })
                ->where('status', 'Approved')
                ->where('start_date', '<=', $todayStr)
                ->where('end_date', '>=', $todayStr)
                ->get();
            $onLeaveToday = $onLeaveTodayRequests->count();
            $onLeaveTodayList = $onLeaveTodayRequests->map(function ($req) {
                return [
                    'name' => $req->user->first_name . ' ' . $req->user->last_name,
                    'leave_type' => $req->leaveType ? $req->leaveType->name : 'Leave'
                ];
            });

            $wfhTodayRequests = LeaveRequest::with('user:id,first_name,last_name', 'leaveType:id,name')
                ->whereHas('leaveType', function ($query) {
                    $query->where('name', 'like', '%Work From Home%')
                          ->orWhere('name', 'like', '%WFH%');
                })
                ->where('status', 'Approved')
                ->where('start_date', '<=', $todayStr)
                ->where('end_date', '>=', $todayStr)
                ->get();
            $wfhToday = $wfhTodayRequests->count();
            $wfhTodayList = $wfhTodayRequests->map(function ($req) {
                return [
                    'name' => $req->user->first_name . ' ' . $req->user->last_name,
                    'leave_type' => $req->leaveType ? $req->leaveType->name : 'WFH'
                ];
            });
                
            $pendingGlobalRequests = 0;
            if ($user->hasRole('Super Admin') || $user->hasRole('HR')) {
                try {
                    $pendingLeaves = LeaveRequest::where(function ($mainQ) {
                        $mainQ->where(function ($subQ) {
                            $subQ->where('admin_status', 'Pending')
                                 ->where('status', 'Pending')
                                 ->where(function ($q) {
                                     $q->whereIn('tl_status', ['Approved', 'Not Required'])
                                       ->orWhereColumn('start_date', 'end_date');
                                 });
                        })->orWhere('pending_lop_conversion', true);
                    })->count();

                    $pendingWfh = \App\Models\WfhRequest::where('admin_status', 'Pending')
                        ->whereIn('tl_status', ['Approved', 'Not Required'])
                        ->where('status', 'Pending')->count();
                    $pendingGlobalRequests = $pendingLeaves + $pendingWfh;
                } catch (\Exception $e) {
                    \Log::warning('Failed to count pending requests: ' . $e->getMessage());
                    $pendingGlobalRequests = 0;
                }
            } elseif ($user->hasRole('Team Lead')) {
                try {
                    $teamId = $user->team_id;
                    if (!$teamId) {
                        \Log::warning('Team Lead has no team_id assigned', ['user_id' => $user->id]);
                        $pendingGlobalRequests = 0;
                    } else {
                        $pendingLeaves = LeaveRequest::whereHas('user', fn($q) => $q->where('team_id', $teamId))
                            ->where('tl_status', 'Pending')
                            ->where('status', 'Pending')->count();
                        $pendingWfh = \App\Models\WfhRequest::whereHas('user', fn($q) => $q->where('team_id', $teamId))
                            ->where('tl_status', 'Pending')
                            ->where('status', 'Pending')->count();
                        $pendingGlobalRequests = $pendingLeaves + $pendingWfh;

                        // Fetch pending approvals for Team Lead
                        $pendingApprovalsData = LeaveRequest::with('user:id,first_name,last_name', 'leaveType:id,name')
                            ->whereHas('user', fn($q) => $q->where('team_id', $teamId))
                            ->where('tl_status', 'Pending')
                            ->where('status', 'Pending')
                            ->orderBy('created_at', 'desc')
                            ->take(5)
                            ->get()
                            ->map(function($req) {
                                return [
                                    'id' => $req->id,
                                    'employee_name' => $req->user->first_name . ' ' . $req->user->last_name,
                                    'leave_type' => $req->leaveType?->name ?? 'Leave',
                                    'start_date' => $req->start_date,
                                    'end_date' => $req->end_date,
                                    'days' => (int)$req->days
                                ];
                            });

                        // Fetch team members with their status (optimized with single query, excluding the Team Lead)
                        $teamMembers = User::where('team_id', $teamId)
                            ->where('status', 'Active')
                            ->where('users.id', '!=', $user->id)
                            ->leftJoin('attendance', function ($join) use ($todayStr) {
                                $join->on('users.id', '=', 'attendance.user_id')
                                     ->where('attendance.date', $todayStr);
                            })
                            ->leftJoin('leave_requests as lr', function ($join) use ($todayStr) {
                                $join->on('users.id', '=', 'lr.user_id')
                                     ->where('lr.status', 'Approved')
                                     ->where('lr.start_date', '<=', $todayStr)
                                     ->where('lr.end_date', '>=', $todayStr);
                            })
                            ->leftJoin('leave_types', function ($join) {
                                $join->on('lr.leave_type_id', '=', 'leave_types.id')
                                     ->whereNotNull('lr.leave_type_id');
                            })
                            ->select('users.id', 'users.first_name', 'users.last_name',
                                     DB::raw('CASE WHEN lr.id IS NULL THEN NULL
                                                  WHEN leave_types.name LIKE "%Work From Home%" OR leave_types.name LIKE "%WFH%" THEN "WFH"
                                                  ELSE "Leave" END as leave_status'),
                                     DB::raw('IF(attendance.check_in_time IS NOT NULL, 1, 0) as has_checkin'))
                            ->distinct()
                            ->get()
                            ->map(function($member) {
                                $status = 'Not Checked In';
                                if ($member->leave_status === 'Leave') {
                                    $status = 'On Leave';
                                } elseif ($member->leave_status === 'WFH') {
                                    $status = 'WFH';
                                } elseif ($member->has_checkin) {
                                    $status = 'Present';
                                }
                                return [
                                    'id' => $member->id,
                                    'name' => $member->first_name . ' ' . $member->last_name,
                                    'status' => $status
                                ];
                            });

                        $responseData['widgets']['pending_approvals'] = $pendingApprovalsData;
                        $responseData['widgets']['team_members'] = $teamMembers;
                    }
                } catch (\Exception $e) {
                    \Log::error('Team Lead dashboard error: ' . $e->getMessage(), ['exception' => $e]);
                    $pendingGlobalRequests = 0;
                }
            }
            
            // Global Activity Feed (optimized with LIMIT)
            $twoDaysAgo = \Carbon\Carbon::today('Asia/Kolkata')->subDays(2);

            $recentLeaves = LeaveRequest::with('user:id,first_name,last_name')
                ->where('created_at', '>=', $twoDaysAgo)
                ->latest()
                ->limit(5)
                ->get()
                ->map(function($l) {
                    return [
                        'type' => 'leave',
                        'message' => $l->user->first_name . ' applied for leave',
                        'date' => $l->created_at
                    ];
                });

            $recentUsers = User::with('team:id,name')
                ->where('created_at', '>=', $twoDaysAgo)
                ->latest()
                ->limit(5)
                ->get()
                ->map(function($u) {
                    $teamName = $u->team ? $u->team->name : 'the company';
                    return [
                        'type' => 'user',
                        'message' => $u->first_name . ' joined ' . $teamName,
                        'date' => $u->created_at
                    ];
                });

            $recentPolicies = \App\Models\HrPolicy::where('created_at', '>=', $twoDaysAgo)
                ->latest()
                ->limit(5)
                ->get()
                ->map(function($p) {
                    return [
                        'type' => 'policy',
                        'message' => 'New policy published: ' . $p->title,
                        'date' => $p->created_at
                    ];
                });

            $globalFeed = collect($recentLeaves)->merge($recentUsers)->merge($recentPolicies)
                ->sortByDesc('date')
                ->take(8)
                ->values();
                
            // For Super Admin, add additional widgets
            if ($user->hasRole('Super Admin')) {
                try {
                    // Critical Alerts
                    $criticalAlerts = [];
                    $absenceRate = ($totalEmployees > 0) ? round((($totalEmployees - $presentToday) / $totalEmployees) * 100) : 0;
                    if ($absenceRate > 30) {
                        $criticalAlerts[] = [
                            'id' => 'absence_high',
                            'message' => "High absence rate: {$absenceRate}% of employees absent today"
                        ];
                    }
                    if ($pendingGlobalRequests > 10) {
                        $criticalAlerts[] = [
                            'id' => 'pending_high',
                            'message' => "{$pendingGlobalRequests} leave/WFH requests pending approval"
                        ];
                    }

                    // Audit Logs
                    $auditLogs = \App\Models\AuditLog::with('user:id,first_name,last_name')
                        ->latest()
                        ->take(10)
                        ->get(['id', 'user_id', 'action', 'description', 'created_at'])
                        ->map(function($log) {
                            return [
                                'id' => $log->id,
                                'action' => $log->action ?? 'System',
                                'description' => $log->description ?? 'No description',
                                'user_name' => ($log->user ? $log->user->first_name . ' ' . $log->user->last_name : 'System'),
                                'created_at' => $log->created_at
                            ];
                        });

                    $responseData['widgets']['critical_alerts'] = $criticalAlerts;
                    $responseData['widgets']['recent_audit_logs'] = $auditLogs;
                    $responseData['widgets']['total_employees'] = $totalEmployees;
                    $responseData['widgets']['active_employees'] = $presentToday;
                    $responseData['widgets']['absent_today'] = $totalEmployees - $presentToday;
                    $responseData['widgets']['pending_leave_requests'] = $pendingGlobalRequests;
                } catch (\Exception $e) {
                    \Log::error('Super Admin dashboard widgets error: ' . $e->getMessage(), [
                        'trace' => $e->getTraceAsString()
                    ]);
                    // Return widgets without admin-specific data to prevent complete failure
                    $responseData['widgets']['critical_alerts'] = [];
                    $responseData['widgets']['recent_audit_logs'] = [];
                }
            }

            $responseData['admin_data'] = [
                'kpis' => [
                    'total_employees' => $totalEmployees,
                    'present_today' => $presentToday,
                    'on_leave_today' => $onLeaveToday,
                    'on_leave_today_list' => $onLeaveTodayList,
                    'wfh_today' => $wfhToday,
                    'wfh_today_list' => $wfhTodayList,
                    'pending_requests' => $pendingGlobalRequests,
                    'trends' => [
                        'employees' => '+2%',
                        'attendance' => ($attendanceTrend > 0 ? '+' : '') . $attendanceTrend . '%'
                    ]
                ],
                'activity_feed' => $globalFeed
            ];
        }

        return response()->json($responseData);
    }

    public function activities(Request $request)
    {
        // Limit to last 30 days and paginate efficiently
        $thirtyDaysAgo = Carbon::now()->subDays(30);
        $perPage = 15;
        $page = $request->input('page', 1);

        $recentLeaves = LeaveRequest::with('user:id,first_name,last_name')
            ->where('created_at', '>=', $thirtyDaysAgo)
            ->latest()
            ->limit(50)
            ->get()
            ->map(function($l) {
                return [
                    'type' => 'leave',
                    'message' => $l->user->first_name . ' applied for leave',
                    'date' => $l->created_at
                ];
            });

        $recentUsers = User::with('team:id,name')
            ->where('created_at', '>=', $thirtyDaysAgo)
            ->latest()
            ->limit(50)
            ->get()
            ->map(function($u) {
                $teamName = $u->team ? $u->team->name : 'the company';
                return [
                    'type' => 'user',
                    'message' => $u->first_name . ' joined ' . $teamName,
                    'date' => $u->created_at
                ];
            });

        $recentPolicies = \App\Models\HrPolicy::where('created_at', '>=', $thirtyDaysAgo)
            ->latest()
            ->limit(50)
            ->get()
            ->map(function($p) {
                return [
                    'type' => 'policy',
                    'message' => 'New policy published: ' . $p->title,
                    'date' => $p->created_at
                ];
            });

        $globalFeed = collect($recentLeaves)->merge($recentUsers)->merge($recentPolicies)
            ->sortByDesc('date')
            ->values();

        $paginatedItems = new \Illuminate\Pagination\LengthAwarePaginator(
            $globalFeed->forPage($page, $perPage)->values(),
            $globalFeed->count(),
            $perPage,
            $page,
            ['path' => \Illuminate\Pagination\Paginator::resolveCurrentPath()]
        );

        return response()->json($paginatedItems);
    }
}
