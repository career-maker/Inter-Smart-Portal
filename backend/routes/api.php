<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;

Route::get('ping', [\App\Http\Controllers\Api\MaintenanceController::class, 'ping']);

Route::get('photos/{path}', [\App\Http\Controllers\Api\EmployeeController::class, 'showPhoto'])->where('path', '.*');
Route::get('storage/{path}', [\App\Http\Controllers\Api\EmployeeController::class, 'showStorageFile'])->where('path', '.*');
Route::get('hr-policies/{hrPolicy}/download', [\App\Http\Controllers\Api\HrPolicyController::class, 'download']);

// Portal Customization (Public read for instant styling and asset loading)
Route::get('customization/settings', [\App\Http\Controllers\Api\CustomizationController::class, 'getSettings']);
Route::get('uploads/customization/{filename}', [\App\Http\Controllers\Api\CustomizationController::class, 'showAsset']);
Route::get('api/uploads/customization/{filename}', [\App\Http\Controllers\Api\CustomizationController::class, 'showAsset']);

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

Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    // Community Feed & Milestone Celebrations Routes
    Route::get('community/summary', [\App\Http\Controllers\Api\CommunityController::class, 'getSummary']);
    Route::get('community/employees', [\App\Http\Controllers\Api\CommunityController::class, 'getEmployees']);
    Route::get('community/projects', [\App\Http\Controllers\Api\CommunityController::class, 'getProjects']);
    Route::get('community/posts', [\App\Http\Controllers\Api\CommunityController::class, 'index']);
    Route::post('community/posts', [\App\Http\Controllers\Api\CommunityController::class, 'store']);
    Route::post('community/posts/{id}/like', [\App\Http\Controllers\Api\CommunityController::class, 'toggleLike']);
    Route::post('community/posts/{id}/comments', [\App\Http\Controllers\Api\CommunityController::class, 'addComment']);
    Route::post('community/posts/{id}/vote', [\App\Http\Controllers\Api\CommunityController::class, 'votePoll']);
    Route::delete('community/posts/{id}', [\App\Http\Controllers\Api\CommunityController::class, 'destroy']);
    Route::delete('community/comments/{id}', [\App\Http\Controllers\Api\CommunityController::class, 'destroyComment']);

    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('me', [AuthController::class, 'me']);

    // Employee Profile Edit Requests
    Route::get('profile', [\App\Http\Controllers\Api\ProfileController::class, 'show']);
    Route::get('me/profile/request', [\App\Http\Controllers\Api\ProfileUpdateRequestController::class, 'currentRequest']);
    Route::post('me/profile/request', [\App\Http\Controllers\Api\ProfileUpdateRequestController::class, 'storeRequest']);
    Route::put('me/profile', [\App\Http\Controllers\Api\ProfileController::class, 'update']);
    Route::get('me/recognitions', [\App\Http\Controllers\Api\RecognitionController::class, 'myRecognitions']);

    // Team read routes for all authenticated users (team switchers, task filters, etc.)
    Route::get('teams', [\App\Http\Controllers\Api\TeamController::class, 'index']);
    Route::get('teams/{team}', [\App\Http\Controllers\Api\TeamController::class, 'show']);

    // Employee Routes
    Route::middleware(['role:Super Admin|Team Lead|HR'])->group(function () {
        Route::apiResource('employees', \App\Http\Controllers\Api\EmployeeController::class);
        Route::post('employees/{employee}/password', [\App\Http\Controllers\Api\EmployeeController::class, 'updatePassword']);
        Route::post('employees/{employee}/photo', [\App\Http\Controllers\Api\EmployeeController::class, 'updatePhoto']);
        Route::post('employees/{employee}/photo-url', [\App\Http\Controllers\Api\EmployeeController::class, 'updatePhotoUrl']);
        Route::post('employees/{employee}/status', [\App\Http\Controllers\Api\EmployeeController::class, 'updateStatus']);
        Route::get('employees/import/sample', [\App\Http\Controllers\Api\EmployeeController::class, 'sampleCSV']);
        Route::post('employees/import/csv', [\App\Http\Controllers\Api\EmployeeController::class, 'importCSV']);

        // Team Mutating Routes
        Route::apiResource('teams', \App\Http\Controllers\Api\TeamController::class)->except(['index', 'show']);
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
    });

    // Super Admin Routes
    Route::middleware(['role:Super Admin'])->group(function () {
        Route::get('settings', [\App\Http\Controllers\Api\SystemSettingController::class, 'index']);
        Route::post('settings', [\App\Http\Controllers\Api\SystemSettingController::class, 'store']);
        Route::get('audit-logs', [\App\Http\Controllers\Api\AuditLogController::class, 'index']);
        Route::get('access-settings', [\App\Http\Controllers\Api\AccessSettingsController::class, 'show']);
        Route::post('access-settings', [\App\Http\Controllers\Api\AccessSettingsController::class, 'update']);
        Route::post('access-settings/reset', [\App\Http\Controllers\Api\AccessSettingsController::class, 'reset']);
        Route::get('module-switches', [\App\Http\Controllers\Api\ModuleSwitchController::class, 'show']);
        Route::post('module-switches', [\App\Http\Controllers\Api\ModuleSwitchController::class, 'update']);
        Route::get('admin/content-cleanup/types', [\App\Http\Controllers\Api\ContentCleanupController::class, 'types']);
        Route::get('admin/content-cleanup', [\App\Http\Controllers\Api\ContentCleanupController::class, 'index']);
        Route::post('admin/content-cleanup/delete', [\App\Http\Controllers\Api\ContentCleanupController::class, 'destroy']);

        // Customization module (Super Admin only)
        Route::post('customization/settings', [\App\Http\Controllers\Api\CustomizationController::class, 'updateSettings']);
        Route::post('customization/upload', [\App\Http\Controllers\Api\CustomizationController::class, 'uploadAsset']);
        Route::post('customization/reset', [\App\Http\Controllers\Api\CustomizationController::class, 'resetSettings']);

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
        Route::post('admin/run-annual-allocation', [\App\Http\Controllers\Api\MaintenanceController::class, 'runAnnualAllocation']);

        // Protected Super Admin Database migration maintenance endpoint
        Route::post('admin/run-migrations', [\App\Http\Controllers\Api\MaintenanceController::class, 'runMigrations']);

        // Protected Super Admin Cache optimization maintenance endpoint
        Route::post('admin/optimize-cache', [\App\Http\Controllers\Api\MaintenanceController::class, 'optimizeCache']);

        // Fix timezone-corrupted attendance records
        Route::post('admin/fix-attendance-timezone', [\App\Http\Controllers\Api\MaintenanceController::class, 'fixAttendanceTimezone']);

        // Ensure all required leave types exist (useful if migrations didn't run)
        Route::post('admin/ensure-leave-types', [\App\Http\Controllers\Api\MaintenanceController::class, 'ensureLeaveTypes']);

        // Emergency: Ensure missing database columns exist for admin leave/WFH creation
        Route::post('admin/ensure-database-columns', [\App\Http\Controllers\Api\MaintenanceController::class, 'ensureDatabaseColumns']);
    });

    // Employee Leave Routes
    Route::get('leave-types', [\App\Http\Controllers\Api\LeaveTypeController::class, 'index']);
    Route::get('leave-types/{leaveType}', [\App\Http\Controllers\Api\LeaveTypeController::class, 'show']);
    // Leave Balance Routes
    Route::get('leave-balances', [\App\Http\Controllers\Api\LeaveBalanceController::class, 'index']);
    Route::post('leave-balances/{userId}', [\App\Http\Controllers\Api\LeaveBalanceController::class, 'adjust']);
    Route::get('leave-balance-audit-logs', [\App\Http\Controllers\Api\LeaveBalanceController::class, 'auditLogs']);
    Route::get('leave-balances/debug', [\App\Http\Controllers\Api\LeaveBalanceController::class, 'debug']);

    // Leave Policy Management (Add-ons module)
    Route::prefix('leave-policy')->group(function () {
        Route::get('settings', [\App\Http\Controllers\Api\LeavePolicyController::class, 'getSettings']);
        Route::get('employees', [\App\Http\Controllers\Api\LeavePolicyController::class, 'getEmployees']);
        Route::get('ledger', [\App\Http\Controllers\Api\LeavePolicyController::class, 'getLedger']);

        Route::middleware(['role:Super Admin'])->group(function () {
            Route::post('settings', [\App\Http\Controllers\Api\LeavePolicyController::class, 'updateSettings']);
            Route::post('employees/{userId}', [\App\Http\Controllers\Api\LeavePolicyController::class, 'updateEmployeePolicy']);
            Route::post('employees/{userId}/clear-probation', [\App\Http\Controllers\Api\LeavePolicyController::class, 'clearEmployeeProbation']);
            Route::post('adjust-balance/{userId}', [\App\Http\Controllers\Api\LeavePolicyController::class, 'adjustEmployeeBalance']);
            Route::post('trigger-cycle', [\App\Http\Controllers\Api\LeavePolicyController::class, 'triggerCycle']);
        });
    });

    // Email Management Routes (Super Admin only)
    Route::prefix('email-settings')->middleware(['role:Super Admin'])->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\EmailSettingController::class, 'index']);
        Route::post('smtp', [\App\Http\Controllers\Api\EmailSettingController::class, 'updateSmtp']);
        Route::post('routing', [\App\Http\Controllers\Api\EmailSettingController::class, 'updateRouting']);
        Route::post('employee-overrides', [\App\Http\Controllers\Api\EmailSettingController::class, 'updateEmployeeOverrides']);
        Route::get('approval-routing', [\App\Http\Controllers\Api\EmailSettingController::class, 'getApprovalRouting']);
        Route::post('approval-routing', [\App\Http\Controllers\Api\EmailSettingController::class, 'updateApprovalRouting']);
        Route::post('test', [\App\Http\Controllers\Api\EmailSettingController::class, 'sendTestEmail']);
    });

    Route::post('leaves/calculate', [\App\Http\Controllers\Api\LeaveRequestController::class, 'calculate']);
    Route::post('leave-requests/{leaveRequest}/cancel', [\App\Http\Controllers\Api\LeaveRequestController::class, 'cancel']);
    Route::apiResource('leave-requests', \App\Http\Controllers\Api\LeaveRequestController::class)->only(['index', 'store', 'destroy']);
    Route::post('leave-requests/{leaveRequest}/status', [\App\Http\Controllers\Api\LeaveRequestController::class, 'updateStatus']);
    Route::post('wfh-requests/{wfhRequest}/cancel', [\App\Http\Controllers\Api\WfhRequestController::class, 'cancel']);
    Route::apiResource('wfh-requests', \App\Http\Controllers\Api\WfhRequestController::class)->only(['index', 'store', 'destroy']);
    Route::post('wfh-requests/{wfhRequest}/status', [\App\Http\Controllers\Api\WfhRequestController::class, 'updateStatus']);

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
        Route::post('{id}/cancel', [\App\Http\Controllers\Api\TARequestController::class, 'cancel']);

        // Diagnostic endpoint (Super Admin only)
        Route::middleware('role:Super Admin')->get('diagnose/schema', [\App\Http\Controllers\Api\MaintenanceController::class, 'diagnoseSchema']);

        // Admin routes
        Route::middleware('role:Super Admin')->group(function () {
            Route::post('{id}/approve', [\App\Http\Controllers\Api\TARequestController::class, 'approve']);
            Route::post('{id}/reject', [\App\Http\Controllers\Api\TARequestController::class, 'reject']);
            Route::post('{id}/override', [\App\Http\Controllers\Api\TARequestController::class, 'override']);
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

    Route::get('features', [\App\Http\Controllers\Api\FeatureController::class, 'index']);

    // Accounts module (Phase 1): hidden (404) until module.accounts.enabled is switched on.
    Route::prefix('accounts')->middleware(['feature:accounts', 'accounts.access'])->group(function () {
        $projects = \App\Http\Controllers\Api\Accounts\AccountsProjectController::class;
        Route::get('projects', [$projects, 'index']);
        Route::get('projects/{project}', [$projects, 'show']);
        Route::put('projects/{project}/finance', [$projects, 'saveFinance']);
        Route::post('projects/{project}/payments', [$projects, 'requestPayment']);
        Route::post('projects/{project}/budget-increase', [$projects, 'increaseBudget']);
        Route::post('projects/{project}/status', [$projects, 'setStatus']);
        Route::post('payments/{payment}/approve', [$projects, 'approvePayment']);
        Route::post('payments/{payment}/reject', [$projects, 'rejectPayment']);

        $targets = \App\Http\Controllers\Api\Accounts\SalesTargetController::class;
        Route::get('sales-people', [$targets, 'salesPeople']);
        Route::get('targets', [$targets, 'index']);
        Route::post('targets', [$targets, 'store']);
        Route::delete('targets/{target}', [$targets, 'destroy']);

        $amc = \App\Http\Controllers\Api\Accounts\AmcController::class;
        Route::get('amc', [$amc, 'index']);
        Route::post('amc', [$amc, 'store']);
        Route::put('amc/{amc}', [$amc, 'update']);
    });

    // Sales module (Phase 2): hidden (404) until module.sales.enabled is switched on.
    // Extra fields on the Sales new-project form: read by Sales/Project Office, changed by the project manager / Super Admin (checked in the controller).
    Route::get('project-custom-fields', [\App\Http\Controllers\Api\Sales\ProjectCustomFieldController::class, 'index']);
    Route::post('project-custom-fields', [\App\Http\Controllers\Api\Sales\ProjectCustomFieldController::class, 'store']);
    Route::delete('project-custom-fields/{id}', [\App\Http\Controllers\Api\Sales\ProjectCustomFieldController::class, 'destroy']);
    Route::prefix('sales')->middleware(['feature:sales', 'sales.access'])->group(function () {
        Route::get('dashboard', [\App\Http\Controllers\Api\Sales\SalesDashboardController::class, 'index']);

        $leads = \App\Http\Controllers\Api\Sales\LeadController::class;
        Route::get('leads', [$leads, 'index']);
        Route::post('leads', [$leads, 'store']);
        Route::put('leads/{lead}', [$leads, 'update']);
        Route::delete('leads/{lead}', [$leads, 'destroy']);
        Route::post('leads/{lead}/activities', [$leads, 'addActivity']);
        Route::get('inbox', [$leads, 'inbox']);
        Route::put('activities/{activity}', [$leads, 'updateActivity']);

        $projects = \App\Http\Controllers\Api\Sales\SalesProjectController::class;
        Route::get('projects', [$projects, 'index']);
        Route::post('projects', [$projects, 'store']);
        Route::post('projects/{project}/status', [$projects, 'setStatus']);

        $done = \App\Http\Controllers\Api\Sales\CompletedProjectController::class;
        Route::get('completed', [$done, 'index']);
        Route::put('projects/{project}/amc', [$done, 'setAmc']);

        $oos = \App\Http\Controllers\Api\Sales\OutOfScopeController::class;
        Route::get('out-of-scope', [$oos, 'index']);
        Route::post('out-of-scope/{oos}/reply', [$oos, 'reply']);
    });

    // Department work screens (Phase 4): hidden (404) until module.workflow.enabled is switched on.
    // Access is per project (see WorkAccess), so there is no role middleware here.
    Route::prefix('work')->middleware(['feature:workflow'])->group(function () {
        $ui = \App\Http\Controllers\Api\Work\UiWorkflowController::class;
        Route::get('projects', [$ui, 'myProjects']);
        Route::get('projects/{project}/ui', [$ui, 'index']);
        Route::post('projects/{project}/ui/pages', [$ui, 'storePage']);
        Route::get('ui/pages/{page}', [$ui, 'show']);
        Route::put('ui/pages/{page}', [$ui, 'updatePage']);
        Route::post('ui/pages/{page}/decision', [$ui, 'decidePage']);
        Route::post('ui/pages/{page}/status', [$ui, 'setStatus']);
        Route::post('ui/pages/{page}/sections', [$ui, 'storeSection']);
        Route::put('ui/sections/{section}', [$ui, 'updateSection']);
        Route::delete('ui/sections/{section}', [$ui, 'destroySection']);

        // Department tables: Design, Frontend (HTML) and Dev, plus QA requests raised from the Frontend and Dev tables.
        $tr = \App\Http\Controllers\Api\Work\TrackerController::class;
        Route::get('projects/{project}/tracker/{kind}', [$tr, 'index']);
        Route::post('projects/{project}/tracker/{kind}', [$tr, 'store']);
        Route::put('tracker/rows/{row}', [$tr, 'update']);
        Route::delete('tracker/rows/{row}', [$tr, 'destroy']);
        Route::post('tracker/rows/{row}/subtasks', [$tr, 'addSubtask']);
        Route::delete('tracker/subtasks/{subtask}', [$tr, 'destroySubtask']);
        $qr = \App\Http\Controllers\Api\Work\QaRequestController::class;
        Route::get('projects/{project}/qa-requests', [$qr, 'index']);
        Route::post('tracker/rows/{row}/qa-request', [$qr, 'store']);
        Route::post('qa-requests/{qaRequest}/assign', [$qr, 'assign']);
        Route::post('qa-requests/{qaRequest}/status', [$qr, 'status']);

        $sp = \App\Http\Controllers\Api\Work\SprintController::class;
        Route::get('projects/{project}/sprints', [$sp, 'index']);
        Route::post('projects/{project}/sprints', [$sp, 'store']);
        Route::get('sprints/{sprint}', [$sp, 'show']);
        Route::put('sprints/{sprint}', [$sp, 'update']);
        Route::post('sprints/{sprint}/items', [$sp, 'storeItem']);
        Route::put('sprint-items/{item}', [$sp, 'updateItem']);
        Route::delete('sprint-items/{item}', [$sp, 'destroyItem']);
        Route::post('sprints/{sprint}/submit', [$sp, 'submit']);
        Route::post('sprints/{sprint}/decision', [$sp, 'decide']);
        Route::post('sprints/{sprint}/request-dates', [$sp, 'requestDates']);
        Route::post('sprints/{sprint}/schedule', [$sp, 'schedule']);
        Route::post('sprint-items/{item}/status', [$sp, 'itemStatus']);

        $ch = \App\Http\Controllers\Api\Work\ChangeController::class;
        Route::get('projects/{project}/changes', [$ch, 'index']);
        Route::post('projects/{project}/changes', [$ch, 'store']);
        Route::post('changes/{change}/estimate', [$ch, 'estimate']);
        Route::post('changes/{change}/decision', [$ch, 'decide']);
        Route::post('changes/{change}/assign', [$ch, 'assign']);
        Route::post('changes/{change}/progress', [$ch, 'progress']);

        Route::get('dashboard', \App\Http\Controllers\Api\Work\WorkDashboardController::class);
        Route::get('go-live', [\App\Http\Controllers\Api\Pmo\GoLiveController::class, 'queue']);
        $ib = \App\Http\Controllers\Api\Work\InboxController::class;
        Route::get('inbox', [$ib, 'inbox']);
        Route::get('team', [$ib, 'team']);
        Route::post('team/{member}/feedback', [$ib, 'feedback']);

        $qa = \App\Http\Controllers\Api\Work\QaController::class;
        Route::get('qa/queue', [$qa, 'queue']);
        Route::get('projects/{project}/qa', [$qa, 'forProject']);
        Route::get('qa/reviews/{review}', [$qa, 'show']);
        Route::post('qa/reviews/{review}/take', [$qa, 'take']);
        Route::post('qa/reviews/{review}/bugs', [$qa, 'addBug']);
        Route::put('qa/bugs/{bug}', [$qa, 'updateBug']);
        Route::post('qa/reviews/{review}/complete', [$qa, 'complete']);
    });

    // Appreciation: dark until module.appreciation.enabled; nominate and approve rules are checked in the controller.
    Route::prefix('appreciations')->middleware(['feature:appreciation'])->group(function () {
        $ap = \App\Http\Controllers\Api\Work\AppreciationController::class;
        Route::get('/', [$ap, 'index']);
        Route::get('people', [$ap, 'people']);
        Route::post('/', [$ap, 'store']);
        Route::post('{appreciation}/decision', [$ap, 'decide']);
    });

    // HR performance figures (no rating formula): dark until module.hr_performance.enabled; HR and Super Admin only (checked in the controller).
    Route::get('hr/performance', \App\Http\Controllers\Api\Work\HrPerformanceController::class . '@index')->middleware('feature:hr_performance');

    // Customer feedback notes: dark until module.customer_feedback.enabled; project manager and HR only (checked in the controller).
    Route::prefix('customer-feedback')->middleware(['feature:customer_feedback'])->group(function () {
        $cf = \App\Http\Controllers\Api\Work\CustomerFeedbackController::class;
        Route::get('/', [$cf, 'index']);
        Route::post('/', [$cf, 'store']);
    });

    // Meetings: dark until module.meetings.enabled; then open to every signed-in person (organiser/attendee rules are in the controller).
    Route::prefix('meetings')->middleware(['feature:meetings'])->group(function () {
        $mt = \App\Http\Controllers\Api\Work\MeetingController::class;
        Route::get('/', [$mt, 'index']);
        Route::post('/', [$mt, 'store']);
        Route::get('people', [$mt, 'people']);
        Route::put('actions/{action}/toggle', [$mt, 'toggleAction']);
        Route::get('{meeting}', [$mt, 'show']);
        Route::put('{meeting}', [$mt, 'update']);
        Route::post('{meeting}/minutes', [$mt, 'minutes']);
        Route::post('{meeting}/cancel', [$mt, 'cancel']);
        Route::post('{meeting}/actions', [$mt, 'addAction']);
        Route::get('{meeting}/ics', [$mt, 'ics']);
    });

    // Project Office (Phase 3): hidden (404) until module.pmo.enabled is switched on.
    Route::prefix('pmo')->middleware(['feature:pmo', 'pmo.access'])->group(function () {
        $pmo = \App\Http\Controllers\Api\Pmo\PmoProjectController::class;
        Route::get('meta', [$pmo, 'meta']);
        Route::get('tracker', [\App\Http\Controllers\Api\Pmo\BudgetWatchController::class, 'tracker']);
        Route::get('budget-watch', [\App\Http\Controllers\Api\Pmo\BudgetWatchController::class, 'index']);
        Route::get('projects', [$pmo, 'index']);
        Route::get('projects/{project}', [$pmo, 'show']);
        Route::post('projects/{project}/assign', [$pmo, 'assign']);
        Route::post('projects/{project}/accept', [$pmo, 'accept']);
        Route::put('projects/{project}/budget', [$pmo, 'setBudget']);
        Route::post('projects/{project}/hold', [$pmo, 'hold']);
        Route::post('projects/{project}/resume', [$pmo, 'resume']);
        Route::post('projects/{project}/overrides', [$pmo, 'override']);
        Route::delete('projects/{project}/overrides/{type}', [$pmo, 'removeOverride']);

        $work = \App\Http\Controllers\Api\Pmo\PmoWorkController::class;
        Route::put('projects/{project}/business-analysis', [$work, 'saveBusinessAnalysis']);
        Route::post('projects/{project}/resources', [$work, 'addResource']);
        Route::delete('projects/{project}/resources/{resource}', [$work, 'removeResource']);
        Route::post('projects/{project}/out-of-scope', [$work, 'requestOutOfScope']);
        Route::get('out-of-scope', [$work, 'outOfScopeQueue']);
        Route::post('out-of-scope/{oos}/decide', [$work, 'decideOutOfScope']);

        $gl = \App\Http\Controllers\Api\Pmo\GoLiveController::class;
        Route::post('projects/{project}/payment-request', [$gl, 'requestPayment']);
        Route::post('projects/{project}/go-live', [$gl, 'requestServer']);
    });
    // The system admin team is not part of the Project Office, so its go-live steps sit outside the pmo.access check (the controller checks the team).
    Route::prefix('pmo')->middleware(['feature:pmo'])->group(function () {
        $gl = \App\Http\Controllers\Api\Pmo\GoLiveController::class;
        Route::get('projects/{project}/go-live', [$gl, 'show']);
        Route::post('projects/{project}/go-live/handle', [$gl, 'handle']);
    });
    Route::get('activities', [\App\Http\Controllers\Api\DashboardController::class, 'activities']);

    // Calendar & Holidays (all authenticated users can view)
    Route::get('calendar', [\App\Http\Controllers\Api\CalendarController::class, 'index']);
    Route::middleware('role:Super Admin')->get('calendar/overview', [\App\Http\Controllers\Api\CalendarController::class, 'overview']);
    Route::get('holidays', [\App\Http\Controllers\Api\HolidayController::class, 'index']);
    Route::get('working-days-overrides', [\App\Http\Controllers\Api\HolidayController::class, 'getOverrides']);
    Route::get('employees-search', [\App\Http\Controllers\Api\EmployeeController::class, 'searchDirectory']);
    Route::get('employees/{employee}/public', [\App\Http\Controllers\Api\EmployeeController::class, 'publicProfile']);

    // Holiday & Override management — Super Admin & HR only
    Route::middleware(['role:Super Admin|HR'])->group(function () {
        Route::post('holidays', [\App\Http\Controllers\Api\HolidayController::class, 'store']);
        Route::post('holidays/seed-kerala', [\App\Http\Controllers\Api\HolidayController::class, 'seedKeralaHolidays']);
        Route::put('holidays/{holiday}', [\App\Http\Controllers\Api\HolidayController::class, 'update']);
        Route::delete('holidays/{holiday}', [\App\Http\Controllers\Api\HolidayController::class, 'destroy']);
        Route::post('working-days-overrides', [\App\Http\Controllers\Api\HolidayController::class, 'storeOverride']);
        Route::delete('working-days-overrides/{id}', [\App\Http\Controllers\Api\HolidayController::class, 'destroyOverride']);
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
        Route::put('{id}/assign', [\App\Http\Controllers\Api\IssueController::class, 'assign']);
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
Route::post('system/scheduler/run', [\App\Http\Controllers\Api\MaintenanceController::class, 'runScheduler'])->middleware('throttle:5,1');


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
    // Static endpoints MUST be registered before wildcard {project}
    Route::post('import-hubstaff', [\App\Http\Controllers\Api\HubstaffProjectController::class, 'importAll']);
    Route::get('/', [\App\Http\Controllers\Api\ProjectController::class, 'index']);
    Route::post('/', [\App\Http\Controllers\Api\ProjectController::class, 'store']);
    Route::get('{project}', [\App\Http\Controllers\Api\ProjectController::class, 'show']);
    Route::put('{project}', [\App\Http\Controllers\Api\ProjectController::class, 'update']);
    Route::delete('{project}', [\App\Http\Controllers\Api\ProjectController::class, 'destroy']);
    Route::get('{project}/members', [\App\Http\Controllers\Api\ProjectController::class, 'members']);
    Route::post('{project}/members', [\App\Http\Controllers\Api\ProjectController::class, 'addMember']);
    Route::delete('{project}/members/{userId}', [\App\Http\Controllers\Api\ProjectController::class, 'removeMember']);
    Route::post('{project}/coordinator', [\App\Http\Controllers\Api\ProjectController::class, 'setCoordinator']);
    Route::post('{project}/mark-live', [\App\Http\Controllers\Api\ProjectController::class, 'markAsLive']);
    Route::get('{project}/status-details', [\App\Http\Controllers\Api\ProjectController::class, 'statusDetails']);
    Route::post('{project}/tasks', [\App\Http\Controllers\Api\ProjectTaskController::class, 'store']);
});

Route::middleware('auth:sanctum')->prefix('project-tasks')->group(function () {
    Route::get('import/template', [\App\Http\Controllers\Api\ProjectTaskController::class, 'sampleCSV']);
    Route::post('import', [\App\Http\Controllers\Api\ProjectTaskController::class, 'importCSV']);
    Route::get('daily-report', [\App\Http\Controllers\Api\ProjectTaskController::class, 'dailyReport']);
    Route::get('team-members', [\App\Http\Controllers\Api\ProjectTaskController::class, 'getTeamMembers']);
    Route::get('/', [\App\Http\Controllers\Api\ProjectTaskController::class, 'index']);
    Route::get('my', [\App\Http\Controllers\Api\ProjectTaskController::class, 'my']);
    Route::get('{task}', [\App\Http\Controllers\Api\ProjectTaskController::class, 'show']);
    Route::put('{task}', [\App\Http\Controllers\Api\ProjectTaskController::class, 'update']);
    Route::delete('{task}', [\App\Http\Controllers\Api\ProjectTaskController::class, 'destroy']);
    Route::post('{task}/status', [\App\Http\Controllers\Api\ProjectTaskController::class, 'updateStatus']);
    Route::post('{task}/assignees', [\App\Http\Controllers\Api\ProjectTaskController::class, 'addAssignee']);
    Route::delete('{task}/assignees/{userId}', [\App\Http\Controllers\Api\ProjectTaskController::class, 'removeAssignee']);
    Route::post('{task}/coordinator', [\App\Http\Controllers\Api\ProjectTaskController::class, 'setCoordinator']);
    Route::get('{task}/comments', [\App\Http\Controllers\Api\ProjectTaskCommentController::class, 'index']);
    Route::post('{task}/comments', [\App\Http\Controllers\Api\ProjectTaskCommentController::class, 'store']);
});

Route::middleware('auth:sanctum')->prefix('pm/addons')->group(function () {
    Route::get('/', [\App\Http\Controllers\Api\AddonController::class, 'index']);
    Route::get('my', [\App\Http\Controllers\Api\AddonController::class, 'getMyAddons']);
    Route::post('{addon}/assign-teams', [\App\Http\Controllers\Api\AddonController::class, 'assignTeams']);
    Route::post('{addon}/toggle-status', [\App\Http\Controllers\Api\AddonController::class, 'toggleStatus']);
});

Route::middleware('auth:sanctum')->prefix('addons/permissions')->group(function () {
    Route::get('/', [\App\Http\Controllers\Api\TeamPermissionController::class, 'index']);
    Route::post('/', [\App\Http\Controllers\Api\TeamPermissionController::class, 'update']);
});

Route::middleware('auth:sanctum')->get('user-permissions', [\App\Http\Controllers\Api\TeamPermissionController::class, 'getMyPermissions']);

Route::middleware('auth:sanctum')->prefix('pm/bug-reports')->group(function () {
    Route::get('/', [\App\Http\Controllers\Api\BugReportController::class, 'index']);
});

Route::middleware('auth:sanctum')->prefix('bugzilla')->group(function () {
    // Project management
    Route::get('projects', [\App\Http\Controllers\Api\Bugzilla\BugzillaProjectController::class, 'index']);
    Route::get('projects/unmapped-portal', [\App\Http\Controllers\Api\Bugzilla\BugzillaProjectController::class, 'unmappedPortalProjects']);
    Route::post('projects', [\App\Http\Controllers\Api\Bugzilla\BugzillaProjectController::class, 'store']);
    Route::post('projects/auto-create', [\App\Http\Controllers\Api\Bugzilla\BugzillaProjectController::class, 'autoCreate']);
    Route::get('projects/{id}', [\App\Http\Controllers\Api\Bugzilla\BugzillaProjectController::class, 'show']);
    Route::put('projects/{id}', [\App\Http\Controllers\Api\Bugzilla\BugzillaProjectController::class, 'update']);

    // Component management
    Route::get('projects/{projectId}/components', [\App\Http\Controllers\Api\Bugzilla\BugzillaComponentController::class, 'index']);
    Route::post('projects/{projectId}/components', [\App\Http\Controllers\Api\Bugzilla\BugzillaComponentController::class, 'store']);
    Route::put('components/{id}', [\App\Http\Controllers\Api\Bugzilla\BugzillaComponentController::class, 'update']);
    Route::delete('components/{id}', [\App\Http\Controllers\Api\Bugzilla\BugzillaComponentController::class, 'destroy']);

    // Bug management
    Route::get('bugs', [\App\Http\Controllers\Api\Bugzilla\BugzillaBugController::class, 'index']);
    Route::post('bugs/check-duplicates', [\App\Http\Controllers\Api\Bugzilla\BugzillaBugController::class, 'checkDuplicates']);
    Route::post('bugs/bulk-update', [\App\Http\Controllers\Api\Bugzilla\BugzillaBugController::class, 'bulkUpdate']);
    Route::post('bugs', [\App\Http\Controllers\Api\Bugzilla\BugzillaBugController::class, 'store']);
    Route::get('bugs/{id}', [\App\Http\Controllers\Api\Bugzilla\BugzillaBugController::class, 'show']);
    Route::put('bugs/{id}', [\App\Http\Controllers\Api\Bugzilla\BugzillaBugController::class, 'update']);
    Route::delete('bugs/{id}', [\App\Http\Controllers\Api\Bugzilla\BugzillaBugController::class, 'destroy']);

    // Comments
    Route::get('bugs/{bugId}/comments', [\App\Http\Controllers\Api\Bugzilla\BugzillaCommentController::class, 'index']);
    Route::post('bugs/{bugId}/comments', [\App\Http\Controllers\Api\Bugzilla\BugzillaCommentController::class, 'store']);

    // Attachments
    Route::post('bugs/{bugId}/attachments', [\App\Http\Controllers\Api\Bugzilla\BugzillaAttachmentController::class, 'store']);
    Route::delete('attachments/{id}', [\App\Http\Controllers\Api\Bugzilla\BugzillaAttachmentController::class, 'destroy']);

    // Dependencies
    Route::post('bugs/{bugId}/dependencies', [\App\Http\Controllers\Api\Bugzilla\BugzillaDependencyController::class, 'store']);
    Route::delete('dependencies/{id}', [\App\Http\Controllers\Api\Bugzilla\BugzillaDependencyController::class, 'destroy']);

    // Watchers
    Route::post('bugs/{bugId}/watch', [\App\Http\Controllers\Api\Bugzilla\BugzillaWatcherController::class, 'toggle']);

    // Saved Searches
    Route::get('saved-searches', [\App\Http\Controllers\Api\Bugzilla\BugzillaSavedSearchController::class, 'index']);
    Route::post('saved-searches', [\App\Http\Controllers\Api\Bugzilla\BugzillaSavedSearchController::class, 'store']);
    Route::delete('saved-searches/{id}', [\App\Http\Controllers\Api\Bugzilla\BugzillaSavedSearchController::class, 'destroy']);

    // Reports & Dashboard metrics
    Route::get('overview', [\App\Http\Controllers\Api\Bugzilla\BugzillaReportController::class, 'overview']);
    Route::get('reports', [\App\Http\Controllers\Api\Bugzilla\BugzillaReportController::class, 'reports']);
});

Route::middleware('auth:sanctum')->prefix('pm-task-catalog')->group(function () {
    Route::get('/', [\App\Http\Controllers\Api\ProjectTaskCatalogController::class, 'index']);
    Route::post('/', [\App\Http\Controllers\Api\ProjectTaskCatalogController::class, 'store']);
    Route::get('{catalog}', [\App\Http\Controllers\Api\ProjectTaskCatalogController::class, 'show']);
    Route::put('{catalog}', [\App\Http\Controllers\Api\ProjectTaskCatalogController::class, 'update']);
    Route::delete('{catalog}', [\App\Http\Controllers\Api\ProjectTaskCatalogController::class, 'destroy']);
});

Route::middleware('auth:sanctum')->prefix('hubstaff')->group(function () {
    Route::get('analytics', [\App\Http\Controllers\Api\HubstaffProjectController::class, 'analytics']);
    Route::get('daily-report', [\App\Http\Controllers\Api\HubstaffProjectController::class, 'dailyReport']);
    Route::get('projects', [\App\Http\Controllers\Api\HubstaffProjectController::class, 'index']);
    Route::get('users', [\App\Http\Controllers\Api\HubstaffProjectController::class, 'getUsers']);
    Route::post('link-user', [\App\Http\Controllers\Api\HubstaffProjectController::class, 'linkUser']);
    Route::post('sync-users', [\App\Http\Controllers\Api\HubstaffProjectController::class, 'syncUsers']);
});

// Backward compatibility alias for pm/hubstaff routes
Route::middleware('auth:sanctum')->prefix('pm/hubstaff')->group(function () {
    Route::get('analytics', [\App\Http\Controllers\Api\HubstaffProjectController::class, 'analytics']);
    Route::get('daily-report', [\App\Http\Controllers\Api\HubstaffProjectController::class, 'dailyReport']);
    Route::get('projects', [\App\Http\Controllers\Api\HubstaffProjectController::class, 'index']);
    Route::get('users', [\App\Http\Controllers\Api\HubstaffProjectController::class, 'getUsers']);
    Route::post('link-user', [\App\Http\Controllers\Api\HubstaffProjectController::class, 'linkUser']);
    Route::post('sync-users', [\App\Http\Controllers\Api\HubstaffProjectController::class, 'syncUsers']);
});

// Direct Chat / Community Private Messaging routes
Route::middleware('auth:sanctum')->prefix('direct-chat')->group(function () {
    Route::get('conversations', [\App\Http\Controllers\Api\DirectChatController::class, 'index']);
    Route::post('conversations/direct', [\App\Http\Controllers\Api\DirectChatController::class, 'startOrGetDirectConversation']);
    Route::get('users/search', [\App\Http\Controllers\Api\DirectChatController::class, 'searchUsers']);
    Route::get('conversations/{conversation}/messages', [\App\Http\Controllers\Api\DirectChatController::class, 'getMessages']);
    Route::post('conversations/{conversation}/messages', [\App\Http\Controllers\Api\DirectChatController::class, 'sendMessage']);
    Route::post('conversations/{conversation}/read', [\App\Http\Controllers\Api\DirectChatController::class, 'markAsRead']);
    Route::post('heartbeat', [\App\Http\Controllers\Api\DirectChatController::class, 'heartbeat']);
    Route::get('unread-count', [\App\Http\Controllers\Api\DirectChatController::class, 'unreadCount']);

    // Super Admin Chat Audit & Deletion
    Route::get('admin/conversations', [\App\Http\Controllers\Api\DirectChatController::class, 'adminGetAllConversations']);
    Route::get('admin/conversations/{conversation}/messages', [\App\Http\Controllers\Api\DirectChatController::class, 'adminGetConversationHistory']);
    Route::delete('admin/conversations/{conversation}/clear', [\App\Http\Controllers\Api\DirectChatController::class, 'adminClearConversationHistory']);
    Route::delete('admin/messages/{message}', [\App\Http\Controllers\Api\DirectChatController::class, 'adminDeleteMessage']);
});

// Super Admin Storage & Retention Settings
Route::middleware('auth:sanctum')->prefix('storage-settings')->group(function () {
    Route::get('/', [\App\Http\Controllers\Api\StorageRetentionController::class, 'getSettings']);
    Route::post('/', [\App\Http\Controllers\Api\StorageRetentionController::class, 'saveSettings']);
    Route::post('/cleanup-now', [\App\Http\Controllers\Api\StorageRetentionController::class, 'cleanupNow']);
});

// Emergency Contacts routes (Dashboard & Super Admin Management)
Route::middleware('auth:sanctum')->prefix('emergency-contacts')->group(function () {
    Route::get('/', [\App\Http\Controllers\Api\EmergencyContactController::class, 'index']);
});

Route::middleware('auth:sanctum')->prefix('admin/emergency-contacts')->group(function () {
    Route::get('/', [\App\Http\Controllers\Api\EmergencyContactController::class, 'adminIndex']);
    Route::post('/', [\App\Http\Controllers\Api\EmergencyContactController::class, 'store']);
    Route::post('sync-team-leads', [\App\Http\Controllers\Api\EmergencyContactController::class, 'syncTeamLeads']);
    Route::put('{id}', [\App\Http\Controllers\Api\EmergencyContactController::class, 'update']);
    Route::delete('{id}', [\App\Http\Controllers\Api\EmergencyContactController::class, 'destroy']);
    Route::patch('{id}/toggle', [\App\Http\Controllers\Api\EmergencyContactController::class, 'toggle']);
    Route::post('reorder', [\App\Http\Controllers\Api\EmergencyContactController::class, 'reorder']);
});

// Sticky Notes routes (Accessible to all authenticated user roles)
Route::middleware('auth:sanctum')->prefix('sticky-notes')->group(function () {
    Route::get('/', [\App\Http\Controllers\Api\StickyNoteController::class, 'index']);
    Route::post('/', [\App\Http\Controllers\Api\StickyNoteController::class, 'store']);
    Route::put('{id}', [\App\Http\Controllers\Api\StickyNoteController::class, 'update']);
    Route::delete('clear', [\App\Http\Controllers\Api\StickyNoteController::class, 'clear']);
    Route::delete('{id}', [\App\Http\Controllers\Api\StickyNoteController::class, 'destroy']);
});



