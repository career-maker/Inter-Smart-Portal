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

class DashboardController extends Controller
{
    /**
     * Display the dashboard data for the authenticated user.
     */
    public function index(Request $request)
    {
        $user = $request->user()->load(['team:id,name', 'roles:id,name']);
        
        // 1. User Profile & Service Duration
        $joiningDate = $user->joining_date ? Carbon::parse($user->joining_date) : null;
        $serviceDuration = null;
        if ($joiningDate) {
            $diff = $joiningDate->diff(Carbon::now());
            $serviceDuration = "{$diff->y} Years {$diff->m} Months {$diff->d} Days";
        }

        $profile = [
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'designation' => $user->designation,
            'team' => $user->team->name ?? 'Unassigned',
            'service_duration' => $serviceDuration,
        ];

        // Add Attendance Status
        $todayStr = Carbon::today()->toDateString();
        $todayStr = Carbon::today()->toDateString();
        $todayAttendance = \App\Models\Attendance::where('user_id', $user->id)
            ->where('date', $todayStr)
            ->first();
            
        $profile['attendance_status'] = 'Not Punched In';
        if ($todayAttendance) {
            if ($todayAttendance->check_out_time) {
                $profile['attendance_status'] = 'Punched Out';
            } else {
                $profile['attendance_status'] = 'Punched In';
            }
        }

        // 2. Leave Metrics
        $currentYear = Carbon::now()->year;
        
        $balance = LeaveBalance::where('user_id', $user->id)->first();
            
        $casualLeaveBalance = $balance ? $balance->casual_leave_balance : 0;
        $sickLeaveBalance = $balance ? $balance->sick_leave_balance : 0;

        $totalLeavesTaken = LeaveRequest::where('user_id', $user->id)
            ->where('status', 'Approved')
            ->count(); // Assuming total historically for simplicity, or we could filter by year

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
            'casual_leave_balance' => $casualLeaveBalance,
            'sick_leave_balance' => $sickLeaveBalance,
            'total_leaves_taken' => $totalLeavesTaken,
            'pending_leaves' => $pendingLeaves,
            'employees_on_leave_today' => $employeesOnLeaveTodayRequests->count(),
            'employees_on_leave_today_list' => $employeesOnLeaveTodayList,
        ];

        // 3. Widgets: Upcoming Holidays
        $upcomingHolidays = Holiday::where('date', '>=', Carbon::today())
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

        // 5. Celebrations (Birthdays & Anniversaries in next 7 days)
        $celebrations = Cache::remember('dashboard_celebrations', now()->addHours(24), function () {
            $today = Carbon::today();
            $nextWeek = Carbon::today()->addDays(7);
            
            $allActiveUsers = User::where('status', 'Active')->get(['first_name', 'last_name', 'dob', 'joining_date']);
            
            $birthdays = [];
            $anniversaries = [];

            foreach ($allActiveUsers as $u) {
                if ($u->dob) {
                    $dobThisYear = Carbon::parse($u->dob)->setYear($today->year);
                    if ($dobThisYear->between($today, $nextWeek)) {
                        $birthdays[] = [
                            'name' => "{$u->first_name} {$u->last_name}",
                            'date' => $dobThisYear->toDateString(),
                        ];
                    }
                }
                if ($u->joining_date) {
                    $joinThisYear = Carbon::parse($u->joining_date)->setYear($today->year);
                    if ($joinThisYear->between($today, $nextWeek) && $u->joining_date !== $today->toDateString()) {
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
        
        $today = Carbon::today();
        $targetDate = Carbon::today()->addDays($upcomingDays);
        
        $fullUsers = User::with('team:id,name')->where('status', 'Active')->get(['id', 'first_name', 'last_name', 'dob', 'designation', 'team_id']);
        
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
                        'name' => "{$u->first_name} {$u->last_name}",
                        'designation' => $u->designation,
                        'department' => $u->team ? $u->team->name : 'Unassigned',
                        'date' => $dobThisYear->toDateString(),
                        'days_remaining' => $daysRemaining,
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
                
            $pendingGlobalRequests = LeaveRequest::where('status', 'Pending')->count();
            
            // Global Activity Feed
            $twoDaysAgo = \Carbon\Carbon::today()->subDays(2);
            
            $recentLeaves = LeaveRequest::with('user:id,first_name,last_name')
                ->where('created_at', '>=', $twoDaysAgo)
                ->latest()
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
        $recentLeaves = \App\Models\LeaveRequest::with('user:id,first_name,last_name')
            ->get()
            ->map(function($l) {
                return [
                    'type' => 'leave',
                    'message' => $l->user->first_name . ' applied for leave',
                    'date' => $l->created_at
                ];
            });
            
        $recentUsers = \App\Models\User::with('team:id,name')
            ->get()
            ->map(function($u) {
                $teamName = $u->team ? $u->team->name : 'the company';
                return [
                    'type' => 'user',
                    'message' => $u->first_name . ' joined ' . $teamName,
                    'date' => $u->created_at
                ];
            });
            
        $recentPolicies = \App\Models\HrPolicy::get()
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

        $page = \Illuminate\Pagination\Paginator::resolveCurrentPage() ?: 1;
        $perPage = 15;
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
