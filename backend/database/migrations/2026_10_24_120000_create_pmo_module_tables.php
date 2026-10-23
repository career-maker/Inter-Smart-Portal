<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Project Office module (Phase 3). Add-only: new tables. Ships dark behind module.pmo.enabled. */
return new class extends Migration
{
    public function up(): void
    {
        // Who coordinates a project, and whether the coordinator has accepted it.
        Schema::create('project_acceptance', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->unique()->constrained('pm_projects')->cascadeOnDelete();
            $table->foreignId('coordinator_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('assigned_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();
        });

        // Budget given to each department (team) on a project.
        Schema::create('project_budget_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('pm_projects')->cascadeOnDelete();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->foreignId('allocated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['project_id', 'team_id']);
        });

        // Why a project is on hold (history; cleared_at null = current).
        Schema::create('project_holds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('pm_projects')->cascadeOnDelete();
            $table->string('reason_code', 40);
            $table->text('note')->nullable();
            $table->foreignId('set_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('cleared_at')->nullable();
            $table->foreignId('cleared_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['project_id', 'cleared_at']);
        });

        // Payment / budget lock overrides on project tabs.
        Schema::create('project_overrides', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('pm_projects')->cascadeOnDelete();
            $table->string('type', 20); // payment | budget
            $table->text('reason');
            $table->foreignId('by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['project_id', 'type']);
        });

        Schema::create('project_business_analysis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->unique()->constrained('pm_projects')->cascadeOnDelete();
            $table->text('purpose')->nullable();
            $table->text('about_company')->nullable();
            $table->text('competitors')->nullable();
            $table->text('audience')->nullable();
            $table->text('usp')->nullable();
            $table->text('conclusion')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('project_resources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('pm_projects')->cascadeOnDelete();
            $table->string('kind', 30); // Brand book | Logo | Domain | Brochure | Proposal | Other
            $table->string('title');
            $table->string('url', 1000)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('added_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Extra work the client asks for, raised by the coordinator with effort, approved by the PMO.
        Schema::create('out_of_scope_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('pm_projects')->cascadeOnDelete();
            $table->foreignId('requested_by')->constrained('users')->cascadeOnDelete();
            $table->text('description');
            $table->decimal('effort_days', 8, 2);
            $table->decimal('amount_estimate', 12, 2)->nullable();
            $table->string('status', 20)->default('Pending'); // Pending | Approved | Rejected
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->text('decision_note')->nullable();
            $table->timestamps();
            $table->index(['status', 'project_id']);
        });
    }

    public function down(): void
    {
        foreach (['out_of_scope_requests', 'project_resources', 'project_business_analysis', 'project_overrides', 'project_holds', 'project_budget_allocations', 'project_acceptance'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
