<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('leave_policy_settings')) {
            Schema::table('leave_policy_settings', function (Blueprint $table) {
                if (!Schema::hasColumn('leave_policy_settings', 'late_threshold_time')) {
                    $table->string('late_threshold_time', 10)->default('09:40')->after('wfh_afternoon_cutoff_time');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('leave_policy_settings')) {
            Schema::table('leave_policy_settings', function (Blueprint $table) {
                if (Schema::hasColumn('leave_policy_settings', 'late_threshold_time')) {
                    $table->dropColumn('late_threshold_time');
                }
            });
        }
    }
};
