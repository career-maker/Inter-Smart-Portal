<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Project Management module — pm_task_bugs.
     * Normalized, one-row-per-bug replacement for the legacy QA
     * Tracker's flat bug_count/html_bugs/functional_bugs counters —
     * enables real trend/severity analytics instead of point-in-time
     * totals.
     */
    public function up(): void
    {
        Schema::create('pm_task_bugs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('pm_tasks')->onDelete('cascade');
            $table->string('bug_type'); // HTML | Functional | Other
            $table->string('severity')->default('Medium'); // Low | Medium | High | Critical
            $table->string('status')->default('Open'); // Open | Fixed | Verified | Reopened | Closed
            $table->text('description')->nullable();
            $table->foreignId('reported_by')->constrained('users');
            $table->foreignId('fixed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('reported_at')->useCurrent();
            $table->timestamp('fixed_at')->nullable();
            $table->timestamps();

            $table->index(['task_id', 'bug_type']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pm_task_bugs');
    }
};
