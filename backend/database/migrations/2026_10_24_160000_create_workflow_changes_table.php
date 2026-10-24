<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Department work screens, slice 4: corrections and changes with effort and budget approval (Phase 4). Add-only; dark behind module.workflow.enabled. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_changes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('pm_projects')->cascadeOnDelete();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete(); // department that does the work
            $table->string('kind', 20)->default('Correction'); // Correction | Change
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('status', 20)->default('Requested'); // Requested | Estimated | Approved | Rejected | In progress | Completed
            $table->decimal('effort_days', 8, 2)->default(0);
            $table->decimal('cost_estimate', 12, 2)->default(0); // counted against the department budget once approved
            $table->decimal('time_spent_days', 8, 2)->default(0);
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('estimated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->text('decision_note')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->index(['project_id', 'team_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_changes');
    }
};
