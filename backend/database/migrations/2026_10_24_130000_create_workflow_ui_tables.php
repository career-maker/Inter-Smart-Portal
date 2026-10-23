<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Department work screens, slice 1: UI pages and sections (Phase 4). Add-only; ships dark behind module.workflow.enabled. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_pages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('pm_projects')->cascadeOnDelete();
            $table->string('title');
            $table->unsignedInteger('position')->default(0);
            $table->string('status', 40)->default('Pending');
            $table->string('approval', 20)->default('Approved'); // Approved | Pending (extra page awaiting PM) | Rejected
            $table->string('animation_level', 20)->default('None'); // None | Low | Medium | High
            $table->unsignedInteger('est_sections')->nullable();
            $table->decimal('budget', 12, 2)->nullable();
            $table->string('figma_url', 1000)->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->date('due_date')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['project_id', 'position']);
        });

        Schema::create('page_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('page_id')->constrained('project_pages')->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('page_sections')->cascadeOnDelete(); // sub-section
            $table->string('title');
            $table->string('subtitle')->nullable();
            $table->text('statistics')->nullable();
            $table->text('content')->nullable();
            $table->text('description')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
            $table->index(['page_id', 'position']);
        });

        // Every status change on a page, with who and why (revision history).
        Schema::create('page_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('page_id')->constrained('project_pages')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('from_status', 40)->nullable();
            $table->string('to_status', 40);
            $table->string('update_type', 20)->nullable(); // suggestion | correction | repeated 1/2/3
            $table->text('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('page_events');
        Schema::dropIfExists('page_sections');
        Schema::dropIfExists('project_pages');
    }
};
