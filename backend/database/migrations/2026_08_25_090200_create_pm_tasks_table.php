<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Project Management module — pm_tasks.
     *
     * Real FK to pm_projects (no free-text project_name matching).
     * coordinator_id is a nullable, task-level override of the parent
     * project's project_coordinator_id — both reference the existing
     * `users` table directly, never a separate Coordinator identity.
     * status retains the full legacy vocabulary (Decision 1). Achievement
     * date auto-fill / overdue computation are application logic, not a
     * DB trigger.
     */
    public function up(): void
    {
        Schema::create('pm_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('pm_projects')->onDelete('cascade');
            $table->foreignId('sub_phase_id')->nullable()->constrained('pm_sub_phases')->onDelete('set null');
            $table->foreignId('coordinator_id')->nullable()->constrained('users')->onDelete('set null'); // task-level coordinator override

            $table->string('title');
            $table->text('description')->nullable();

            // Full legacy vocabulary retained per Decision 1 — validated at the
            // application layer (FormRequest `in:` rule), not a DB enum/CHECK.
            $table->string('status')->default('In Progress');
            $table->string('priority')->default('Medium'); // Low | Medium | High | Critical

            $table->date('start_date')->nullable();
            $table->date('due_date')->nullable();
            $table->date('actual_start_date')->nullable();
            $table->date('actual_completion_date')->nullable();

            $table->boolean('include_saturday')->default(false);
            $table->boolean('include_sunday')->default(false);

            $table->text('current_updates')->nullable();
            $table->text('deviation_reason')->nullable(); // also doubles as the rejection reason when status = Rejected

            $table->string('sprint')->nullable();
            $table->string('sprint_link')->nullable();

            $table->decimal('allotted_days', 6, 2)->nullable();
            $table->decimal('time_taken', 6, 2)->nullable();
            $table->decimal('days_taken', 6, 2)->nullable();
            $table->decimal('deviation', 6, 2)->nullable(); // = days_taken - allotted_days, recomputed on save
            $table->decimal('activity_percentage', 5, 2)->nullable();

            $table->foreignId('team_id')->nullable()->constrained('teams')->onDelete('set null'); // per-task team scope — the real cross-team-project mechanism

            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->softDeletes();
            $table->timestamps();

            $table->index(['project_id', 'status']);
            $table->index('due_date');
            $table->index('team_id');
            $table->index('coordinator_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pm_tasks');
    }
};
