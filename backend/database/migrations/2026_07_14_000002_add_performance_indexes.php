<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private function safeIndex($table, $columns): void
    {
        try {
            Schema::table($table, function (Blueprint $table) use ($columns) {
                $table->index($columns);
            });
        } catch (\Exception $e) {
            // Index already exists, skip
        }
    }

    public function up(): void
    {
        // Index for attendance queries
        if (Schema::hasTable('attendances')) {
            $this->safeIndex('attendances', ['user_id', 'date']);
            $this->safeIndex('attendances', ['date', 'check_in_time']);
        }

        // Index for leave request queries
        if (Schema::hasTable('leave_requests')) {
            $this->safeIndex('leave_requests', ['user_id', 'status']);
            $this->safeIndex('leave_requests', ['start_date', 'end_date', 'status']);
            $this->safeIndex('leave_requests', ['status', 'admin_status']);
        }

        // Index for announcement queries
        if (Schema::hasTable('announcements')) {
            $this->safeIndex('announcements', ['is_pinned', 'created_at']);
            $this->safeIndex('announcements', ['expires_at', 'scheduled_at']);
        }

        // Index for user queries
        if (Schema::hasTable('users')) {
            $this->safeIndex('users', ['status']);
            $this->safeIndex('users', ['team_id', 'status']);
            $this->safeIndex('users', ['created_at']);
            $this->safeIndex('users', ['dob']);
            $this->safeIndex('users', ['joining_date']);
        }

        // Index for WFH request queries
        if (Schema::hasTable('wfh_requests')) {
            $this->safeIndex('wfh_requests', ['user_id', 'status']);
            $this->safeIndex('wfh_requests', ['tl_status', 'admin_status']);
        }
    }

    public function down(): void
    {
        // Drop indexes
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'date']);
            $table->dropIndex(['date', 'check_in_time']);
        });

        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'status']);
            $table->dropIndex(['start_date', 'end_date', 'status']);
            $table->dropIndex(['status', 'admin_status']);
        });

        Schema::table('announcements', function (Blueprint $table) {
            $table->dropIndex(['is_pinned', 'created_at']);
            $table->dropIndex(['expires_at', 'scheduled_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['team_id', 'status']);
            $table->dropIndex(['created_at']);
            $table->dropIndex(['dob']);
            $table->dropIndex(['joining_date']);
        });

        if (Schema::hasTable('wfh_requests')) {
            Schema::table('wfh_requests', function (Blueprint $table) {
                $table->dropIndex(['user_id', 'status']);
                $table->dropIndex(['tl_status', 'admin_status']);
            });
        }
    }
};
