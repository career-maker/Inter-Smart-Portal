<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Department trackers shown on the project page: Design (pages), Frontend/HTML (pages with timeline sub-tasks) and Dev (tasks).
 * One table for the three kinds. Plus QA requests raised from the Frontend and Dev tables. Add-only.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_tracker_rows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('pm_projects')->cascadeOnDelete();
            $table->string('kind', 10);                    // design | frontend | dev
            $table->unsignedInteger('no');                 // page number / task number
            $table->string('name');
            $table->string('priority', 2)->nullable();     // design: P0..P3
            $table->string('status', 20);                  // design/frontend status, or dev progress
            $table->string('link', 1000)->nullable();      // design / HTML link
            $table->string('work_type', 30)->nullable();   // dev
            $table->string('client_status', 30)->nullable(); // design
            $table->json('members')->nullable();           // user ids
            $table->decimal('days', 8, 2)->nullable();     // design: person-days used
            $table->decimal('hours', 8, 2)->nullable();    // dev: hours
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['project_id', 'kind']);
        });

        Schema::create('work_tracker_subtasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('row_id')->constrained('work_tracker_rows')->cascadeOnDelete();
            $table->string('title');
            $table->decimal('hours', 8, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('qa_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('pm_projects')->cascadeOnDelete();
            $table->foreignId('row_id')->nullable()->constrained('work_tracker_rows')->nullOnDelete();
            $table->string('kind', 10);                    // frontend | dev
            $table->string('title');
            $table->text('note')->nullable();
            $table->string('status', 20)->default('Requested'); // Requested | Assigned | In testing | Done
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['project_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qa_requests');
        Schema::dropIfExists('work_tracker_subtasks');
        Schema::dropIfExists('work_tracker_rows');
    }
};
