<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Department work screens, slice 3: QA hand-off and bug lists (Phase 4). Add-only; dark behind module.workflow.enabled. */
return new class extends Migration
{
    public function up(): void
    {
        // One review per round: created automatically when a sprint task is marked Completed.
        Schema::create('qa_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('pm_projects')->cascadeOnDelete();
            $table->foreignId('sprint_id')->constrained('work_sprints')->cascadeOnDelete();
            $table->foreignId('sprint_item_id')->constrained('sprint_items')->cascadeOnDelete();
            $table->unsignedTinyInteger('round')->default(1);
            $table->string('status', 20)->default('Open'); // Open | In review | Passed | Failed
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->text('note')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'project_id']);
        });

        Schema::create('qa_bugs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('review_id')->constrained('qa_reviews')->cascadeOnDelete();
            $table->string('title');
            $table->string('priority', 20)->default('Medium'); // Low | Medium | High | Critical
            $table->text('description')->nullable();
            $table->string('status', 20)->default('Open'); // Open | Fixed | Verified
            $table->foreignId('reported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qa_bugs');
        Schema::dropIfExists('qa_reviews');
    }
};
