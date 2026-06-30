<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;

Route::get('/ping', function () {
    return response()->json(['status' => 'alive']);
});

Route::get('/debug-employee', function () {
    return new \App\Http\Resources\EmployeeResource(\App\Models\User::find(2));
});

Route::get('/photos/{path}', [\App\Http\Controllers\Api\EmployeeController::class, 'showPhoto'])->where('path', '.*');

Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    
    // Employee Profile Edit Requests
    Route::get('/me/profile/request', [\App\Http\Controllers\Api\ProfileUpdateRequestController::class, 'currentRequest']);
    Route::post('/me/profile/request', [\App\Http\Controllers\Api\ProfileUpdateRequestController::class, 'storeRequest']);
    Route::put('/me/profile', [\App\Http\Controllers\Api\ProfileController::class, 'update']);
    Route::get('/me/recognitions', [\App\Http\Controllers\Api\RecognitionController::class, 'myRecognitions']);

    // Employee Routes
    Route::middleware(['role:Super Admin|Team Lead|HR'])->group(function () {
        Route::apiResource('employees', \App\Http\Controllers\Api\EmployeeController::class);
        Route::post('employees/{employee}/password', [\App\Http\Controllers\Api\EmployeeController::class, 'updatePassword']);
        Route::post('employees/{employee}/photo', [\App\Http\Controllers\Api\EmployeeController::class, 'updatePhoto']);
        Route::post('employees/{employee}/photo-url', [\App\Http\Controllers\Api\EmployeeController::class, 'updatePhotoUrl']);
        Route::post('employees/{employee}/status', [\App\Http\Controllers\Api\EmployeeController::class, 'updateStatus']);
        
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
        
        // Profile Approvals
        Route::get('profile-requests', [\App\Http\Controllers\Api\ProfileUpdateRequestController::class, 'index']);
        Route::post('profile-requests/{profileRequest}/approve', [\App\Http\Controllers\Api\ProfileUpdateRequestController::class, 'approve']);
        Route::post('profile-requests/{profileRequest}/reject', [\App\Http\Controllers\Api\ProfileUpdateRequestController::class, 'reject']);
        
        // Leave Overrides
        Route::put('leave-requests/{leaveRequest}/override', [\App\Http\Controllers\Api\LeaveRequestController::class, 'override']);
        
        // Manual trigger for annual leave allocation (also runs automatically Jan 1 via cron)
        Route::post('admin/run-annual-allocation', function (\Illuminate\Http\Request $request) {
            $year = $request->input('year', now()->year);
            \Illuminate\Support\Facades\Artisan::call('leave:annual-allocation', ['--year' => $year]);
            $output = \Illuminate\Support\Facades\Artisan::output();
            return response()->json(['message' => 'Annual allocation processed.', 'output' => $output]);
        });
    });
    
    // Employee Leave Routes
    Route::get('leave-types', [\App\Http\Controllers\Api\LeaveTypeController::class, 'index']);
    Route::get('leave-types/{leaveType}', [\App\Http\Controllers\Api\LeaveTypeController::class, 'show']);
    // Leave Balance Routes
    Route::get('leave-balances', [\App\Http\Controllers\Api\LeaveBalanceController::class, 'index']);
    Route::post('leave-balances/{userId}', [\App\Http\Controllers\Api\LeaveBalanceController::class, 'adjust']);
    Route::get('leave-balance-audit-logs', [\App\Http\Controllers\Api\LeaveBalanceController::class, 'auditLogs']);

    Route::post('leaves/calculate', [\App\Http\Controllers\Api\LeaveRequestController::class, 'calculate']);
    Route::apiResource('leave-requests', \App\Http\Controllers\Api\LeaveRequestController::class)->only(['index', 'store']);
    Route::apiResource('wfh-requests', \App\Http\Controllers\Api\WfhRequestController::class)->only(['index', 'store']);
    
    // Attendance Routes
    Route::prefix('attendance')->group(function () {
        Route::get('status', [\App\Http\Controllers\Api\AttendanceController::class, 'status']);
        Route::post('check-in', [\App\Http\Controllers\Api\AttendanceController::class, 'checkIn']);
        Route::post('check-out', [\App\Http\Controllers\Api\AttendanceController::class, 'checkOut']);
        Route::post('break-start', [\App\Http\Controllers\Api\AttendanceController::class, 'startBreak']);
        Route::post('break-end', [\App\Http\Controllers\Api\AttendanceController::class, 'endBreak']);
        Route::get('/', [\App\Http\Controllers\Api\AttendanceController::class, 'index']);
    });
    
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

    // Calendar & Holidays
    Route::get('calendar', [\App\Http\Controllers\Api\CalendarController::class, 'index']);
    Route::apiResource('holidays', \App\Http\Controllers\Api\HolidayController::class)->except(['create', 'edit', 'show']);

    // Announcements (all can read, admin can manage)
    Route::get('announcements', [\App\Http\Controllers\Api\AnnouncementController::class, 'index']);
    Route::post('announcements', [\App\Http\Controllers\Api\AnnouncementController::class, 'store']);
    Route::put('announcements/{announcement}', [\App\Http\Controllers\Api\AnnouncementController::class, 'update']);
    Route::delete('announcements/{announcement}', [\App\Http\Controllers\Api\AnnouncementController::class, 'destroy']);
    
    // Announcement Categories
    Route::get('announcement-categories', [\App\Http\Controllers\Api\AnnouncementCategoryController::class, 'index']);
    Route::post('announcement-categories', [\App\Http\Controllers\Api\AnnouncementCategoryController::class, 'store']);

    // Notifications
    Route::prefix('notifications')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\NotificationController::class, 'index']);
        Route::get('/unread', [\App\Http\Controllers\Api\NotificationController::class, 'unread']);
        Route::post('/mark-as-read/{id?}', [\App\Http\Controllers\Api\NotificationController::class, 'markAsRead']);
        Route::delete('/{id}', [\App\Http\Controllers\Api\NotificationController::class, 'destroy']);
    });

    // Issues / Helpdesk
    Route::prefix('issues')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\IssueController::class, 'index']);
        Route::post('/', [\App\Http\Controllers\Api\IssueController::class, 'store']);
        Route::get('/{id}', [\App\Http\Controllers\Api\IssueController::class, 'show']);
        Route::post('/{id}/comments', [\App\Http\Controllers\Api\IssueController::class, 'addComment']);
        Route::put('/{id}/status', [\App\Http\Controllers\Api\IssueController::class, 'updateStatus']);
    });

    // Recognitions
    Route::get('/active-recognitions', [\App\Http\Controllers\Api\RecognitionController::class, 'activeRecognitions']);
    Route::middleware(['role:Super Admin'])->prefix('recognitions')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\RecognitionController::class, 'index']);
        Route::post('/', [\App\Http\Controllers\Api\RecognitionController::class, 'store']);
        Route::put('/{id}', [\App\Http\Controllers\Api\RecognitionController::class, 'update']);
        Route::put('/{id}/toggle', [\App\Http\Controllers\Api\RecognitionController::class, 'toggleActive']);
        Route::delete('/{id}', [\App\Http\Controllers\Api\RecognitionController::class, 'destroy']);
    });

    // View The Hall (All authenticated users can view)
    Route::get('hall', [\App\Http\Controllers\Api\HallController::class, 'index']);
});

