<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;

Route::get('ping', function () {
    return response()->json(['status' => 'alive']);
});

Route::get('debug-employee', function () {
    return new \App\Http\Resources\EmployeeResource(\App\Models\User::find(2));
});

Route::get('photos/{path}', [\App\Http\Controllers\Api\EmployeeController::class, 'showPhoto'])->where('path', '.*');

Route::get('wfh-requests/diagnose/schema', [\App\Http\Controllers\Api\WfhRequestController::class, 'diagnose']);

// Email action routes (signed URLs, no auth required)
Route::prefix('leave-requests')->group(function () {
    Route::get('{leaveRequest}/email-approve', [\App\Http\Controllers\Api\LeaveRequestController::class, 'emailApprove'])
        ->name('leave-request.email-approve');
    Route::get('{leaveRequest}/email-reject', [\App\Http\Controllers\Api\LeaveRequestController::class, 'emailReject'])
        ->name('leave-request.email-reject');
});

// TA Email action routes (signed URLs, no auth required)
Route::prefix('ta-requests')->group(function () {
    Route::get('{taRequest}/email-approve', [\App\Http\Controllers\Api\TARequestController::class, 'emailApprove'])
        ->name('ta-request.email-approve');
    Route::get('{taRequest}/email-reject', [\App\Http\Controllers\Api\TARequestController::class, 'emailReject'])
        ->name('ta-request.email-reject');
});

Route::post('login', [AuthController::class, 'login']);
Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('reset-password', [AuthController::class, 'resetPassword']);

// Database maintenance endpoint (public, for initial setup)
Route::post('admin/run-migrations', function (\Illuminate\Http\Request $request) {
    try {
        \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        $output = \Illuminate\Support\Facades\Artisan::output();

        return response()->json([
            'message' => 'Migrations completed successfully',
            'output' => $output
        ], 200);
    } catch (\Exception $e) {
        return response()->json([
            'message' => 'Migration failed: ' . $e->getMessage()
        ], 500);
    }
});

// Cache optimization endpoint (public, for cPanel performance)
Route::post('admin/optimize-cache', function (\Illuminate\Http\Request $request) {
    try {
        \Illuminate\Support\Facades\Artisan::call('optimize');
        $output = \Illuminate\Support\Facades\Artisan::output();

        return response()->json([
            'message' => 'Cache optimization completed successfully',
            'output' => $output
        ], 200);
    } catch (\Exception $e) {
        return response()->json([
            'message' => 'Optimization failed: ' . $e->getMessage()
        ], 500);
    }
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('me', [AuthController::class, 'me']);

    // Employee Profile Edit Requests
    Route::get('profile', [\App\Http\Controllers\Api\ProfileController::class, 'show']);
    Route::get('me/profile/request', [\App\Http\Controllers\Api\ProfileUpdateRequestController::class, 'currentRequest']);
    Route::post('me/profile/request', [\App\Http\Controllers\Api\ProfileUpdateRequestController::class, 'storeRequest']);
    Route::put('me/profile', [\App\Http\Controllers\Api\ProfileController::class, 'update']);
    Route::get('me/recognitions', [\App\Http\Controllers\Api\RecognitionController::class, 'myRecognitions']);

    // Employee Routes
    Route::middleware(['role:Super Admin|Team Lead|HR'])->group(function () {
        Route::apiResource('employees', \App\Http\Controllers\Api\EmployeeController::class);
        Route::post('employees/{employee}/password', [\App\Http\Controllers\Api\EmployeeController::class, 'updatePassword']);
        Route::post('employees/{employee}/photo', [\App\Http\Controllers\Api\EmployeeController::class, 'updatePhoto']);
        Route::post('employees/{employee}/photo-url', [\App\Http\Controllers\Api\EmployeeController::class, 'updatePhotoUrl']);
        Route::post('employees/{employee}/status', [\App\Http\Controllers\Api\EmployeeController::class, 'updateStatus']);
        Route::get('employees/import/sample', [\App\Http\Controllers\Api\EmployeeController::class, 'sampleCSV']);
        Route::post('employees/import/csv', [\App\Http\Controllers\Api\EmployeeController::class, 'importCSV']);

        // Team Routes
        Route::apiResource('teams', \App\Http\Controllers\Api\TeamController::class);
        Route::post('teams/{team}/members', [\App\Http\Controllers\Api\TeamController::class, 'syncMembers']);

        // Admin/HR Leave Configuration
        Route::apiResource('leave-types', \App\Http\Controllers\Api\LeaveTypeController::class)->except(['index', 'show']);

        // Reports
        Route::prefix('reports')->group(function () {
            Route::get('employees', [\App\Http\Controllers\Api\ReportController::class, 'employees']);
            Route::get('leaves', [\App\Http\Controllers\Api\ReportController::class, 'leaves']);
            Route::get('leave-balances', [\App\Http\Controllers\Api\ReportController::class, 'leaveBalances']);
            Route::get('attendance-summary', [\App\Http\Controllers\Api\ReportController::class, 'attendanceSummary']);
            Route::get('employee-list', [\App\Http\Controllers\Api\ReportController::class, 'allEmployeesForFilter']);
        });

        // Approvals (Team Leads & Admins)
        Route::post('leave-requests/{leaveRequest}/status', [\App\Http\Controllers\Api\LeaveRequestController::class, 'updateStatus']);
        Route::post('wfh-requests/{wfhRequest}/status', [\App\Http\Controllers\Api\WfhRequestController::class, 'updateStatus']);
    });

    // Super Admin Routes
    Route::middleware(['role:Super Admin'])->group(function () {
        Route::get('settings', [\App\Http\Controllers\Api\SystemSettingController::class, 'index']);
        Route::post('settings', [\App\Http\Controllers\Api\SystemSettingController::class, 'store']);
        Route::get('audit-logs', [\App\Http\Controllers\Api\AuditLogController::class, 'index']);

        // Admin Leave & WFH Marking (for employees who forgot or couldn't apply)
        Route::post('admin/mark-leave', [\App\Http\Controllers\Api\AdminLeaveMarkingController::class, 'markLeave']);
        Route::post('admin/mark-wfh', [\App\Http\Controllers\Api\AdminLeaveMarkingController::class, 'markWfh']);

        // Manage Approved Leaves & WFH (view and delete)
        Route::get('admin/approved-leaves', [\App\Http\Controllers\Api\ApprovedLeaveManagementController::class, 'listApprovedLeaves']);
        Route::get('admin/approved-wfh', [\App\Http\Controllers\Api\ApprovedLeaveManagementController::class, 'listApprovedWfh']);
        Route::delete('admin/approved-leaves/{id}', [\App\Http\Controllers\Api\ApprovedLeaveManagementController::class, 'deleteApprovedLeave']);
        Route::delete('admin/approved-wfh/{id}', [\App\Http\Controllers\Api\ApprovedLeaveManagementController::class, 'deleteApprovedWfh']);

        // Profile Approvals
        Route::get('profile-requests', [\App\Http\Controllers\Api\ProfileUpdateRequestController::class, 'index']);
        Route::post('profile-requests/{profileRequest}/approve', [\App\Http\Controllers\Api\ProfileUpdateRequestController::class, 'approve']);
        Route::post('profile-requests/{profileRequest}/reject', [\App\Http\Controllers\Api\ProfileUpdateRequestController::class, 'reject']);

        // Admin Leave & WFH Creation
        Route::post('admin/leaves', [\App\Http\Controllers\Api\LeaveRequestController::class, 'storeForEmployee']);
        Route::post('admin/wfh', [\App\Http\Controllers\Api\WfhRequestController::class, 'storeForEmployee']);

        // Leave Overrides & LOP Conversion
        Route::put('leave-requests/{leaveRequest}/override', [\App\Http\Controllers\Api\LeaveRequestController::class, 'override']);
        Route::post('leave-requests/{leaveRequest}/confirm-lop', [\App\Http\Controllers\Api\LeaveRequestController::class, 'confirmLopConversion']);
        Route::post('leave-requests/{leaveRequest}/reject-lop', [\App\Http\Controllers\Api\LeaveRequestController::class, 'rejectLopConversion']);
        // Manual trigger for annual leave allocation (also runs automatically Jan 1 via cron)
        Route::post('admin/run-annual-allocation', function (\Illuminate\Http\Request $request) {
            $year = $request->input('year', now()->year);
            \Illuminate\Support\Facades\Artisan::call('leave:annual-allocation', ['--year' => $year]);
            $output = \Illuminate\Support\Facades\Artisan::output();
            return response()->json(['message' => 'Annual allocation processed.', 'output' => $output]);
        });

        // Fix timezone-corrupted attendance records
        Route::post('admin/fix-attendance-timezone', function (\Illuminate\Http\Request $request) {
            $date = $request->input('date');
            $args = [];
            if ($date) {
                $args['--date'] = $date;
            }
            \Illuminate\Support\Facades\Artisan::call('attendance:fix-timezone-corruption', $args);
            $output = \Illuminate\Support\Facades\Artisan::output();
            return response()->json(['message' => 'Attendance timezone corruption fixed.', 'output' => $output]);
        });

        // Ensure all required leave types exist (useful if migrations didn't run)
        Route::post('admin/ensure-leave-types', function (\Illuminate\Http\Request $request) {
            $types = [
                'Sick Leave',
                'Casual Leave',
                'Half Day Sick Leave (Morning)',
                'Half Day Sick Leave (Afternoon)',
                'Half Day Casual Leave (Morning)',
                'Half Day Casual Leave (Afternoon)',
                'Work From Home',
                'Work From Home (Morning)',
                'Work From Home (Afternoon)',
                'Half Day WFH (Morning)',
                'Half Day WFH (Afternoon)'
            ];

            $created = [];
            foreach ($types as $type) {
                $lt = \App\Models\LeaveType::firstOrCreate(['name' => $type]);
                $created[] = $lt->name;
            }

            return response()->json([
                'message' => 'Leave types ensured.',
                'types_created_or_verified' => $created,
                'total' => count($created)
            ], 201);
        });

        // Emergency: Ensure missing database columns exist for admin leave/WFH creation
        Route::post('admin/ensure-database-columns', function (\Illuminate\Http\Request $request) {
            $results = [];

            // Ensure wfh_type_id and attachment_link columns exist in wfh_requests
            if (!\Illuminate\Support\Facades\Schema::hasColumn('wfh_requests', 'wfh_type_id')) {
                \Illuminate\Support\Facades\Schema::table('wfh_requests', function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->foreignId('wfh_type_id')
                        ->nullable()
                        ->constrained('leave_types')
                        ->onDelete('set null');
                });
                $results['wfh_type_id'] = 'created';
            } else {
                $results['wfh_type_id'] = 'already_exists';
            }

            if (!\Illuminate\Support\Facades\Schema::hasColumn('wfh_requests', 'attachment_link')) {
                \Illuminate\Support\Facades\Schema::table('wfh_requests', function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->string('attachment_link')->nullable();
                });
                $results['attachment_link'] = 'created';
            } else {
                $results['attachment_link'] = 'already_exists';
            }

            // Ensure tl_status, admin_status, approver_id columns exist in leave_requests
            if (!\Illuminate\Support\Facades\Schema::hasColumn('leave_requests', 'tl_status')) {
                \Illuminate\Support\Facades\Schema::table('leave_requests', function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->string('tl_status')->default('Pending')->after('status');
                });
                $results['tl_status'] = 'created';
            } else {
                $results['tl_status'] = 'already_exists';
            }

            if (!\Illuminate\Support\Facades\Schema::hasColumn('leave_requests', 'admin_status')) {
                \Illuminate\Support\Facades\Schema::table('leave_requests', function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->string('admin_status')->default('Pending')->after('tl_status');
                });
                $results['admin_status'] = 'created';
            } else {
                $results['admin_status'] = 'already_exists';
            }

            if (!\Illuminate\Support\Facades\Schema::hasColumn('leave_requests', 'approver_id')) {
                \Illuminate\Support\Facades\Schema::table('leave_requests', function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->unsignedBigInteger('approver_id')->nullable()->after('approved_by');
                });
                $results['approver_id'] = 'created';
            } else {
                $results['approver_id'] = 'already_exists';
            }

            return response()->json([
                'message' => 'Database columns checked and ensured.',
                'results' => $results
            ], 200);
        });
    });

    // Employee Leave Routes
    Route::get('leave-types', [\App\Http\Controllers\Api\LeaveTypeController::class, 'index']);
    Route::get('leave-types/{leaveType}', [\App\Http\Controllers\Api\LeaveTypeController::class, 'show']);
    // Leave Balance Routes
    Route::get('leave-balances', [\App\Http\Controllers\Api\LeaveBalanceController::class, 'index']);
    Route::post('leave-balances/{userId}', [\App\Http\Controllers\Api\LeaveBalanceController::class, 'adjust']);
    Route::get('leave-balance-audit-logs', [\App\Http\Controllers\Api\LeaveBalanceController::class, 'auditLogs']);
    Route::get('leave-balances/debug', [\App\Http\Controllers\Api\LeaveBalanceController::class, 'debug']);

    Route::post('leaves/calculate', [\App\Http\Controllers\Api\LeaveRequestController::class, 'calculate']);
    Route::apiResource('leave-requests', \App\Http\Controllers\Api\LeaveRequestController::class)->only(['index', 'store']);
    Route::apiResource('wfh-requests', \App\Http\Controllers\Api\WfhRequestController::class)->only(['index', 'store']);

    // Attendance Routes
    Route::prefix('attendance')->group(function () {
        Route::get('status',  [\App\Http\Controllers\Api\AttendanceController::class, 'status']);
        Route::get('details', [\App\Http\Controllers\Api\AttendanceController::class, 'details']);
        Route::post('check-in',    [\App\Http\Controllers\Api\AttendanceController::class, 'checkIn']);
        Route::post('check-out',   [\App\Http\Controllers\Api\AttendanceController::class, 'checkOut']);
        Route::post('break-start', [\App\Http\Controllers\Api\AttendanceController::class, 'startBreak']);
        Route::post('break-end',   [\App\Http\Controllers\Api\AttendanceController::class, 'endBreak']);
        Route::get('/',            [\App\Http\Controllers\Api\AttendanceController::class, 'index']);
    });

    // Travel Allowance (TA) Routes
    Route::prefix('ta-requests')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\TARequestController::class, 'index']);
        Route::get('{id}', [\App\Http\Controllers\Api\TARequestController::class, 'show']);
        Route::post('/', [\App\Http\Controllers\Api\TARequestController::class, 'store']);

        // Diagnostic endpoint (Super Admin only)
        Route::middleware('role:Super Admin')->get('diagnose/schema', function () {
            $tables = [
                'ta_requests' => \Illuminate\Support\Facades\Schema::hasTable('ta_requests'),
                'ta_request_items' => \Illuminate\Support\Facades\Schema::hasTable('ta_request_items'),
            ];

            $taColumns = $tables['ta_requests'] ? \Illuminate\Support\Facades\Schema::getColumnListing('ta_requests') : [];
            $itemColumns = $tables['ta_request_items'] ? \Illuminate\Support\Facades\Schema::getColumnListing('ta_request_items') : [];

            return response()->json([
                'tables_exist' => $tables,
                'ta_requests_columns' => $taColumns,
                'ta_request_items_columns' => $itemColumns,
                'message' => $tables['ta_requests'] && $tables['ta_request_items']
                    ? 'Database tables exist'
                    : 'Database tables missing - run migrations'
            ]);
        });

        // Admin routes
        Route::middleware('role:Super Admin')->group(function () {
            Route::post('{id}/approve', [\App\Http\Controllers\Api\TARequestController::class, 'approve']);
            Route::post('{id}/reject', [\App\Http\Controllers\Api\TARequestController::class, 'reject']);
            Route::post('{id}/mark-paid', [\App\Http\Controllers\Api\TARequestController::class, 'markPaid']);
        });
    });

    Route::middleware('role:Super Admin')->get('admin/ta-requests', [\App\Http\Controllers\Api\TARequestController::class, 'adminIndex']);

    // Document Requests (all authenticated users can submit/view own)
    Route::get('document-requests', [\App\Http\Controllers\Api\DocumentRequestController::class, 'index']);
    Route::post('document-requests', [\App\Http\Controllers\Api\DocumentRequestController::class, 'store']);

    // HR/Admin: Upload fulfilled document
    Route::post('document-requests/{documentRequest}/upload', [\App\Http\Controllers\Api\DocumentRequestController::class, 'upload']);

    // HR Policies (all can read, admin/HR can write)
    Route::get('hr-policies', [\App\Http\Controllers\Api\HrPolicyController::class, 'index']);
    Route::post('hr-policies', [\App\Http\Controllers\Api\HrPolicyController::class, 'store']);
    Route::delete('hr-policies/{hrPolicy}', [\App\Http\Controllers\Api\HrPolicyController::class, 'destroy']);

    // Dashboard Data
    Route::get('dashboard', [\App\Http\Controllers\Api\DashboardController::class, 'index']);
    Route::get('activities', [\App\Http\Controllers\Api\DashboardController::class, 'activities']);

    // Calendar & Holidays (all authenticated users can view)
    Route::get('calendar', [\App\Http\Controllers\Api\CalendarController::class, 'index']);
    Route::get('holidays', [\App\Http\Controllers\Api\HolidayController::class, 'index']);
    Route::get('employees/{employee}/public', [\App\Http\Controllers\Api\EmployeeController::class, 'publicProfile']);

    // Holiday management — Super Admin & HR only
    Route::middleware(['role:Super Admin|HR'])->group(function () {
        Route::post('holidays', [\App\Http\Controllers\Api\HolidayController::class, 'store']);
        Route::put('holidays/{holiday}', [\App\Http\Controllers\Api\HolidayController::class, 'update']);
        Route::delete('holidays/{holiday}', [\App\Http\Controllers\Api\HolidayController::class, 'destroy']);
    });

    // Announcements (all can read, Super Admin/HR can manage)
    Route::get('announcements', [\App\Http\Controllers\Api\AnnouncementController::class, 'index']);
    Route::middleware(['role:Super Admin|HR'])->group(function () {
        Route::post('announcements', [\App\Http\Controllers\Api\AnnouncementController::class, 'store']);
        Route::put('announcements/{announcement}', [\App\Http\Controllers\Api\AnnouncementController::class, 'update']);
        Route::delete('announcements/{announcement}', [\App\Http\Controllers\Api\AnnouncementController::class, 'destroy']);
    });

    // Announcement Categories
    Route::get('announcement-categories', [\App\Http\Controllers\Api\AnnouncementCategoryController::class, 'index']);
    Route::middleware(['role:Super Admin|HR'])->group(function () {
        Route::post('announcement-categories', [\App\Http\Controllers\Api\AnnouncementCategoryController::class, 'store']);
    });

    // AI Chatbot Routes
    Route::get('chat/context', [\App\Http\Controllers\Api\ChatController::class, 'context']);
    Route::post('chat', [\App\Http\Controllers\Api\ChatController::class, 'store']);

    // Birthday Wishes - All authenticated users can send/receive wishes
    Route::post('birthday-wishes', [\App\Http\Controllers\Api\BirthdayWishController::class, 'store']);
    Route::get('birthday-wishes/my-wishes', [\App\Http\Controllers\Api\BirthdayWishController::class, 'getMyWishes']);
    Route::get('users/{userId}/wishes', [\App\Http\Controllers\Api\BirthdayWishController::class, 'getUserWishes']);
    Route::get('today-wishes', [\App\Http\Controllers\Api\BirthdayWishController::class, 'todayWishes']);
    Route::get('today-birthdays', [\App\Http\Controllers\Api\ReportController::class, 'todaysBirthdays']);

    // Notifications
    Route::prefix('notifications')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\NotificationController::class, 'index']);
        Route::get('unread', [\App\Http\Controllers\Api\NotificationController::class, 'unread']);
        Route::post('mark-as-read/{id?}', [\App\Http\Controllers\Api\NotificationController::class, 'markAsRead']);
        Route::delete('{id}', [\App\Http\Controllers\Api\NotificationController::class, 'destroy']);
    });

    // Issues / Helpdesk
    Route::prefix('issues')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\IssueController::class, 'index']);
        Route::post('/', [\App\Http\Controllers\Api\IssueController::class, 'store']);
        Route::get('{id}', [\App\Http\Controllers\Api\IssueController::class, 'show']);
        Route::post('{id}/comments', [\App\Http\Controllers\Api\IssueController::class, 'addComment']);
        Route::put('{id}/status', [\App\Http\Controllers\Api\IssueController::class, 'updateStatus']);
    });

    // Recognitions
    Route::get('active-recognitions', [\App\Http\Controllers\Api\RecognitionController::class, 'activeRecognitions']);
    // Leaderboard & Top Awardee — accessible by all authenticated users
    Route::get('recognitions/leaderboard', [\App\Http\Controllers\Api\RecognitionController::class, 'leaderboard']);
    Route::get('recognitions/top-awardee', [\App\Http\Controllers\Api\RecognitionController::class, 'topAwardee']);
    Route::get('recognitions/employee/{userId}', [\App\Http\Controllers\Api\RecognitionController::class, 'employeeRecognitions']);
    Route::middleware(['role:Super Admin'])->prefix('recognitions')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\RecognitionController::class, 'index']);
        Route::post('/', [\App\Http\Controllers\Api\RecognitionController::class, 'store']);
        Route::put('/{id}', [\App\Http\Controllers\Api\RecognitionController::class, 'update']);
        Route::put('{id}/toggle', [\App\Http\Controllers\Api\RecognitionController::class, 'toggleActive']);
        Route::delete('{id}', [\App\Http\Controllers\Api\RecognitionController::class, 'destroy']);
    });

    // View The Hall (All authenticated users can view)
    Route::get('hall', [\App\Http\Controllers\Api\HallController::class, 'index']);

    // User Favorites (All authenticated users)
    Route::prefix('favorites')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\FavoriteController::class, 'index']);
        Route::post('/', [\App\Http\Controllers\Api\FavoriteController::class, 'store']);
        Route::delete('{pageHref}', [\App\Http\Controllers\Api\FavoriteController::class, 'destroy'])->where('pageHref', '.*');
        Route::get('check/{pageHref}', [\App\Http\Controllers\Api\FavoriteController::class, 'check'])->where('pageHref', '.*');
    });
});


use App\Http\Controllers\Api\BiometricIngestionController;
use App\Http\Middleware\VerifyBiometricAgent;

// Biometric Agent Integration
Route::post('/v1/biometric/ingest', [BiometricIngestionController::class, 'ingest'])
    ->middleware(VerifyBiometricAgent::class);

// System Scheduler Trigger
Route::post('system/scheduler/run', function (\Illuminate\Http\Request $request) {
    $secret = config('services.scheduler_secret');
    if (empty($secret)) {
        abort(500, 'Scheduler secret unconfigured');
    }

    if (!hash_equals($secret, $request->bearerToken() ?? '')) {
        abort(401, 'Unauthorized');
    }

    \Illuminate\Support\Facades\Artisan::call('schedule:run');

    return response()->json(['status' => 'scheduler_invoked']);
})->middleware('throttle:5,1');


// ──────────────────────────────────────────────────────────────────────────
// Project Management Module (PM) — Stage 7 backend foundation.
//
// Fully isolated/additive: no existing route above this block is touched.
// Every route below requires auth:sanctum (the existing HR Sanctum session
// — no new auth mechanism). Fine-grained capability checks use the
// existing Spatie `$user->can('...')` pattern (new PM permissions only,
// seeded separately — see database/seeders/ProjectManagementPermissionsSeeder.php,
// RolesAndPermissionsSeeder itself is never edited). Object-level checks
// (project membership, task assignee, resolved coordinator, team match)
// are enforced inside the controllers via ProjectAuthorizationService —
// matching the existing codebase's only real authorization pattern
// (inline manual checks, no Laravel Policies, no `permission:` route
// middleware — see LeaveRequestController/WfhRequestController for the
// existing precedent this mirrors).
//
// Project Coordinator is NOT a role and NOT a permission — see
// ProjectAuthorizationService::isEligibleCoordinator() /
// resolveTaskCoordinator(). See PROJECT_MANAGEMENT_MODULE_DESIGN.md.
// ──────────────────────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->prefix('projects')->group(function () {
    Route::get('/', [\App\Http\Controllers\Api\ProjectController::class, 'index']);
    Route::post('/', [\App\Http\Controllers\Api\ProjectController::class, 'store']);
    Route::get('{project}', [\App\Http\Controllers\Api\ProjectController::class, 'show']);
    Route::put('{project}', [\App\Http\Controllers\Api\ProjectController::class, 'update']);
    Route::delete('{project}', [\App\Http\Controllers\Api\ProjectController::class, 'destroy']);
    Route::get('{project}/members', [\App\Http\Controllers\Api\ProjectController::class, 'members']);
    Route::post('{project}/members', [\App\Http\Controllers\Api\ProjectController::class, 'addMember']);
    Route::delete('{project}/members/{userId}', [\App\Http\Controllers\Api\ProjectController::class, 'removeMember']);
    Route::post('{project}/coordinator', [\App\Http\Controllers\Api\ProjectController::class, 'setCoordinator']);
    Route::post('{project}/tasks', [\App\Http\Controllers\Api\ProjectTaskController::class, 'store']);
});

Route::middleware('auth:sanctum')->prefix('project-tasks')->group(function () {
    Route::get('/', [\App\Http\Controllers\Api\ProjectTaskController::class, 'index']);
    Route::get('my', [\App\Http\Controllers\Api\ProjectTaskController::class, 'my']);
    Route::get('{task}', [\App\Http\Controllers\Api\ProjectTaskController::class, 'show']);
    Route::put('{task}', [\App\Http\Controllers\Api\ProjectTaskController::class, 'update']);
    Route::post('{task}/status', [\App\Http\Controllers\Api\ProjectTaskController::class, 'updateStatus']);
    Route::post('{task}/assignees', [\App\Http\Controllers\Api\ProjectTaskController::class, 'addAssignee']);
    Route::delete('{task}/assignees/{userId}', [\App\Http\Controllers\Api\ProjectTaskController::class, 'removeAssignee']);
    Route::post('{task}/coordinator', [\App\Http\Controllers\Api\ProjectTaskController::class, 'setCoordinator']);
    Route::get('{task}/comments', [\App\Http\Controllers\Api\ProjectTaskCommentController::class, 'index']);
    Route::post('{task}/comments', [\App\Http\Controllers\Api\ProjectTaskCommentController::class, 'store']);
});
