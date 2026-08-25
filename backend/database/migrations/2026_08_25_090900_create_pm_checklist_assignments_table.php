<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Project Management module — pm_checklist_assignments.
     *
     * Finalized 2-table checklist model (Decision 5): one row per
     * (project-or-task, checklist_item) pair, holding the pass/fail
     * state directly — equivalent to the legacy QA Tracker's
     * `project_checklists` + `project_checklist_status` merged (they
     * were always 1:1 keyed the same way). checklistable_type/_id is a
     * lightweight polymorphic pair (values 'Project'|'Task'), so no FK
     * constraint is placed on checklistable_id itself — application
     * code resolves it against pm_projects or pm_tasks as appropriate.
     * Progress percentage is computed at read time (checked/total),
     * never stored.
     */
    public function up(): void
    {
        Schema::create('pm_checklist_assignments', function (Blueprint $table) {
            $table->id();
            $table->string('checklistable_type'); // 'Project' | 'Task'
            $table->unsignedBigInteger('checklistable_id');
            $table->foreignId('checklist_item_id')->constrained('pm_checklist_items')->onDelete('cascade');
            $table->boolean('is_checked')->default(false);
            $table->foreignId('checked_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('checked_at')->nullable();
            $table->timestamps();

            $table->unique(['checklistable_type', 'checklistable_id', 'checklist_item_id'], 'pm_checklist_assignments_unique');
            $table->index(['checklistable_type', 'checklistable_id'], 'pm_checklist_assignments_morph_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pm_checklist_assignments');
    }
};
