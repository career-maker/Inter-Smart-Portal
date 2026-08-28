<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('pm_tasks', function (Blueprint $table) {
            if (!Schema::hasColumn('pm_tasks', 'html_bugs')) {
                $table->unsignedInteger('html_bugs')->nullable()->default(0)->after('activity_percentage');
            }
            if (!Schema::hasColumn('pm_tasks', 'functional_bugs')) {
                $table->unsignedInteger('functional_bugs')->nullable()->default(0)->after('html_bugs');
            }
            if (!Schema::hasColumn('pm_tasks', 'total_bugs')) {
                $table->unsignedInteger('total_bugs')->nullable()->default(0)->after('functional_bugs');
            }
            if (!Schema::hasColumn('pm_tasks', 'bug_tracker_link')) {
                $table->string('bug_tracker_link', 2048)->nullable()->after('total_bugs');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pm_tasks', function (Blueprint $table) {
            $table->dropColumn(['html_bugs', 'functional_bugs', 'total_bugs', 'bug_tracker_link']);
        });
    }
};
