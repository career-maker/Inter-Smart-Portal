<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Project Management module — pm_task_assignees.
     *
     * Proper many-to-many join between pm_tasks and the existing HR
     * `users` table. Replaces the legacy QA Tracker's row-duplication
     * pattern entirely — one task row, many assignee rows.
     *
     * individual_status / progress_percentage (Decision 3): optional
     * per-assignee tracking; NULL means "follows the task's own master
     * status". Aggregate views (Reports/Schedule/Bug Analytics) always
     * use the task's single master status, never these overrides, so a
     * multi-assignee task is still exactly one row everywhere else.
     */
    public function up(): void
    {
        Schema::create('pm_task_assignees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('pm_tasks')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('assigned_by')->constrained('users');
            $table->boolean('is_primary')->default(false);
            $table->string('individual_status')->nullable();
            $table->decimal('progress_percentage', 5, 2)->nullable();
            $table->timestamp('assigned_at')->useCurrent();
            $table->timestamps();

            $table->unique(['task_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pm_task_assignees');
    }
};
