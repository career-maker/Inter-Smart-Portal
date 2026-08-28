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
        Schema::table('pm_projects', function (Blueprint $table) {
            if (!Schema::hasColumn('pm_projects', 'is_live')) {
                $table->boolean('is_live')->default(false)->after('status');
            }
            if (!Schema::hasColumn('pm_projects', 'live_date')) {
                $table->date('live_date')->nullable()->after('is_live');
            }
            if (!Schema::hasColumn('pm_projects', 'live_notes')) {
                $table->text('live_notes')->nullable()->after('live_date');
            }
            if (!Schema::hasColumn('pm_projects', 'live_marked_by')) {
                $table->foreignId('live_marked_by')->nullable()->after('live_notes')->constrained('users')->onDelete('set null');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pm_projects', function (Blueprint $table) {
            if (Schema::hasColumn('pm_projects', 'live_marked_by')) {
                $table->dropForeign(['live_marked_by']);
                $table->dropColumn('live_marked_by');
            }
            if (Schema::hasColumn('pm_projects', 'live_date')) {
                $table->dropColumn('live_date');
            }
            if (Schema::hasColumn('pm_projects', 'is_live')) {
                $table->dropColumn('is_live');
            }
        });
    }
};
