<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Index for attendance queries
        Schema::table('attendance', function (Blueprint $table) {
            $table->index(['user_id', 'date']);
            $table->index(['date', 'check_in_time']);
        });

        // Index for leave request queries
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->index(['user_id', 'status']);
            $table->index(['start_date', 'end_date', 'status']);
            $table->index(['status', 'admin_status']);
        });

        // Index for announcement queries
        Schema::table('announcements', function (Blueprint $table) {
            $table->index(['is_pinned', 'created_at']);
            $table->index(['expires_at', 'scheduled_at']);
        });

        // Index for user queries
        Schema::table('users', function (Blueprint $table) {
            $table->index(['status']);
            $table->index(['team_id', 'status']);
            $table->index(['created_at']);
            $table->index(['dob']);
            $table->index(['joining_date']);
        });

        // Index for WFH request queries
        if (Schema::hasTable('wfh_requests')) {
            Schema::table('wfh_requests', function (Blueprint $table) {
                $table->index(['user_id', 'status']);
                $table->index(['tl_status', 'admin_status']);
            });
        }
    }

    public function down(): void
    {
        // Drop indexes
        Schema::table('attendance', function (Blueprint $table) {
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
