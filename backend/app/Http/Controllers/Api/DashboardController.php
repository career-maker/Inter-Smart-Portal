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

        $employeesOnLeaveToday = LeaveRequest::where('status', 'Approved')
            ->where('start_date', '<=', $todayStr)
            ->where('end_date', '>=', $todayStr)
            ->count();

        $leaveMetrics = [
            'casual_leave_balance' => $casualLeaveBalance,
            'sick_leave_balance' => $sickLeaveBalance,
            'total_leaves_taken' => $totalLeavesTaken,
            'pending_leaves' => $pendingLeaves,
            'employees_on_leave_today' => $employeesOnLeaveToday,
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
            
            $onLeaveToday = LeaveRequest::whereHas('leaveType', function ($query) {
                    $query->where('name', 'not like', '%Work From Home%')
                          ->where('name', 'not like', '%WFH%');
                })
                ->where('status', 'Approved')
                ->where('start_date', '<=', $todayStr)
                ->where('end_date', '>=', $todayStr)
                ->count();

            $wfhToday = LeaveRequest::whereHas('leaveType', function ($query) {
                    $query->where('name', 'like', '%Work From Home%')
                          ->orWhere('name', 'like', '%WFH%');
                })
                ->where('status', 'Approved')
                ->where('start_date', '<=', $todayStr)
                ->where('end_date', '>=', $todayStr)
                ->count();
                
            $pendingGlobalRequests = LeaveRequest::where('status', 'Pending')->count();
            
            // Global Activity Feed
            $recentLeaves = LeaveRequest::with('user:id,first_name,last_name')
                ->latest()
                ->take(5)
                ->get()
                ->map(function($l) {
                    return [
                        'type' => 'leave',
                        'message' => $l->user->first_name . ' applied for leave',
                        'date' => $l->created_at
                    ];
                });
                
            $recentUsers = User::with('team:id,name')
                ->latest()
                ->take(5)
                ->get()
                ->map(function($u) {
                    $teamName = $u->team ? $u->team->name : 'the company';
                    return [
                        'type' => 'user',
                        'message' => $u->first_name . ' joined ' . $teamName,
                        'date' => $u->created_at
                    ];
                });
                
            $recentPolicies = \App\Models\HrPolicy::latest()
                ->take(3)
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
                ->values()
                ->take(10);
                
            $responseData['admin_data'] = [
                'kpis' => [
                    'total_employees' => $totalEmployees,
                    'present_today' => $presentToday,
                    'on_leave_today' => $onLeaveToday,
                    'wfh_today' => $wfhToday,
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
}
