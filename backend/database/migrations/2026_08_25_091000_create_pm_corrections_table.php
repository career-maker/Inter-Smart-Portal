<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Project Management module — pm_corrections.
     *
     * Corrections are project-level by default, matching the legacy QA
     * Tracker's actual behavior — task_id is NULLABLE (a correction may
     * optionally be pinned to a specific task, but is never required to
     * be). This is a deliberate correction from an earlier draft of
     * this design that had modeled task_id as required.
     */
    public function up(): void
    {
        Schema::create('pm_corrections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('pm_projects')->onDelete('cascade');
            $table->foreignId('task_id')->nullable()->constrained('pm_tasks')->onDelete('cascade'); // NULLABLE — project-scoped by default

            $table->string('correction_type')->default('Other'); // Bug | Rework | Client Feedback | QA Rejection | Other
            $table->string('severity')->default('Medium'); // Low | Medium | High | Critical
            $table->string('status')->default('Open'); // Open | In Progress | Fixed | Verified | Closed
            $table->text('description');

            $table->foreignId('raised_by')->constrained('users');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->onDelete('set null');

            $table->timestamp('raised_at')->useCurrent();
            $table->timestamp('resolved_at')->nullable();

            $table->foreignId('created_by')->constrained('users');
            $table->softDeletes();
            $table->timestamps();

            $table->index(['project_id', 'status']);
            $table->index('task_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pm_corrections');
    }
};
