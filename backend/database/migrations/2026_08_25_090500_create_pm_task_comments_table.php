<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Project Management module — pm_task_comments.
     * Attributed, timestamped comment history — replaces the legacy
     * QA Tracker's single overwritable free-text `comments` column.
     * Mirrors the existing `issue_comments` table shape.
     */
    public function up(): void
    {
        Schema::create('pm_task_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('pm_tasks')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users');
            $table->text('comment');
            $table->timestamps();

            $table->index('task_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pm_task_comments');
    }
};
