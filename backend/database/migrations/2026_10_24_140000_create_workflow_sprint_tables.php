<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Department work screens, slice 2: UX / Dev sprints with effort approval (Phase 4). Add-only; dark behind module.workflow.enabled. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_sprints', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('pm_projects')->cascadeOnDelete();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete(); // the department doing the work
            $table->string('title');
            $table->string('status', 20)->default('Draft'); // Draft | Submitted | Approved | Rejected | Scheduled | In progress | Completed
            $table->decimal('cost_estimate', 12, 2)->default(0); // checked against the department's project budget
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->text('decision_note')->nullable();
            $table->date('requested_start')->nullable(); // coordinator asks for dates after approval
            $table->date('requested_end')->nullable();
            $table->date('start_date')->nullable();      // team lead confirms
            $table->date('end_date')->nullable();
            $table->timestamps();
            $table->index(['project_id', 'team_id', 'status']);
        });

        Schema::create('sprint_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sprint_id')->constrained('work_sprints')->cascadeOnDelete();
            $table->string('title');
            $table->decimal('effort_days', 8, 2)->default(0);
            $table->decimal('time_spent_days', 8, 2)->default(0);
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 30)->default('Pending');
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('sprint_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sprint_id')->constrained('work_sprints')->cascadeOnDelete();
            $table->foreignId('item_id')->nullable()->constrained('sprint_items')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30);
            $table->text('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sprint_events');
        Schema::dropIfExists('sprint_items');
        Schema::dropIfExists('work_sprints');
    }
};
