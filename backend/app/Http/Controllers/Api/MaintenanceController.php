<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

// Former inline closures from routes/api.php (closures block route:cache). Behaviour unchanged.
class MaintenanceController extends Controller
{
    public function runAnnualAllocation(Request $request)
    {
        $year = $request->input('year', now()->year);
        \Illuminate\Support\Facades\Artisan::call('leave:annual-allocation', ['--year' => $year]);
        $output = \Illuminate\Support\Facades\Artisan::output();
        return response()->json(['message' => 'Annual allocation processed.', 'output' => $output]);
    }

    public function runMigrations(Request $request)
    {
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
    }

    public function optimizeCache(Request $request)
    {
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
    }

    public function fixAttendanceTimezone(Request $request)
    {
        $date = $request->input('date');
        $args = [];
        if ($date) {
            $args['--date'] = $date;
        }
        \Illuminate\Support\Facades\Artisan::call('attendance:fix-timezone-corruption', $args);
        $output = \Illuminate\Support\Facades\Artisan::output();
        return response()->json(['message' => 'Attendance timezone corruption fixed.', 'output' => $output]);
    }

    public function ensureLeaveTypes(Request $request)
    {
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
    }

    public function ensureDatabaseColumns(Request $request)
    {
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

        // Ensure issues table exists with all required columns
        if (!\Illuminate\Support\Facades\Schema::hasTable('issues')) {
            \Illuminate\Support\Facades\Schema::create('issues', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('title');
                $table->string('category');
                $table->string('priority');
                $table->text('description');
                $table->string('related_module')->nullable();
                $table->string('status')->default('Open');
                $table->unsignedBigInteger('assigned_to')->nullable();
                $table->foreign('assigned_to')->references('id')->on('users')->nullOnDelete();
                $table->timestamp('resolved_at')->nullable();
                $table->timestamps();
            });
            $results['issues_table'] = 'created';
        } else {
            $results['issues_table'] = 'already_exists';
            // Ensure assigned_to column exists in existing issues table
            if (!\Illuminate\Support\Facades\Schema::hasColumn('issues', 'assigned_to')) {
                \Illuminate\Support\Facades\Schema::table('issues', function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->unsignedBigInteger('assigned_to')->nullable()->after('status');
                    $table->foreign('assigned_to')->references('id')->on('users')->nullOnDelete();
                });
                $results['issues.assigned_to'] = 'created';
            } else {
                $results['issues.assigned_to'] = 'already_exists';
            }
            // Ensure resolved_at column exists
            if (!\Illuminate\Support\Facades\Schema::hasColumn('issues', 'resolved_at')) {
                \Illuminate\Support\Facades\Schema::table('issues', function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->timestamp('resolved_at')->nullable()->after('assigned_to');
                });
                $results['issues.resolved_at'] = 'created';
            } else {
                $results['issues.resolved_at'] = 'already_exists';
            }
            // Ensure attachment_link column exists
            if (!\Illuminate\Support\Facades\Schema::hasColumn('issues', 'attachment_link')) {
                \Illuminate\Support\Facades\Schema::table('issues', function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->string('attachment_link')->nullable();
                });
                $results['issues.attachment_link'] = 'created';
            } else {
                $results['issues.attachment_link'] = 'already_exists';
            }
        }

        // Ensure issue_comments table exists
        if (!\Illuminate\Support\Facades\Schema::hasTable('issue_comments')) {
            \Illuminate\Support\Facades\Schema::create('issue_comments', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->id();
                $table->foreignId('issue_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->text('comment');
                $table->timestamps();
            });
            $results['issue_comments_table'] = 'created';
        } else {
            $results['issue_comments_table'] = 'already_exists';
        }

        // Ensure issue_attachments table exists
        if (!\Illuminate\Support\Facades\Schema::hasTable('issue_attachments')) {
            \Illuminate\Support\Facades\Schema::create('issue_attachments', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->id();
                $table->foreignId('issue_id')->constrained()->cascadeOnDelete();
                $table->foreignId('issue_comment_id')->nullable()->constrained('issue_comments')->cascadeOnDelete();
                $table->string('file_path');
                $table->string('file_name');
                $table->string('file_type')->nullable();
                $table->timestamps();
            });
            $results['issue_attachments_table'] = 'created';
        } else {
            $results['issue_attachments_table'] = 'already_exists';
        }

        return response()->json([
            'message' => 'Database columns checked and ensured.',
            'results' => $results
        ], 200);
    }

    public function runScheduler(Request $request)
    {
        $secret = config('services.scheduler_secret');
        if (empty($secret)) {
            abort(500, 'Scheduler secret unconfigured');
        }

        if (!hash_equals($secret, $request->bearerToken() ?? '')) {
            abort(401, 'Unauthorized');
        }

        \Illuminate\Support\Facades\Artisan::call('schedule:run');

        return response()->json(['status' => 'scheduler_invoked']);
    }

    public function ping()
    {
        return response()->json(['status' => 'alive']);
    }

    public function webPing()
    {
        return response()->json(['status' => 'ok', 'timestamp' => now()->toIso8601String()]);
    }

    // Web root and the catch-all fallback: JSON for API-style callers, the 404 page otherwise.
    public function notFound(Request $request)
    {
        if ($request->expectsJson()) {
            return response()->json(['message' => 'Not Found'], 404);
        }
        return response()->view('errors.404', [], 404);
    }

    public function diagnoseSchema()
    {
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
    }
}
