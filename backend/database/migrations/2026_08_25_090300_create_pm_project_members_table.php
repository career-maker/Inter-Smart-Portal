<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Project Management module — pm_project_members.
     *
     * project_role intentionally supports only 'Member' | 'Lead' | 'Reviewer'
     * (enforced in application validation). 'Coordinator' is NOT a valid
     * value here — coordinator status lives exclusively in
     * pm_projects.project_coordinator_id / pm_tasks.coordinator_id, so
     * there is exactly one source of truth for who coordinates what.
     */
    public function up(): void
    {
        Schema::create('pm_project_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('pm_projects')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('project_role')->default('Member'); // Member | Lead | Reviewer — never 'Coordinator'
            $table->foreignId('added_by')->constrained('users');
            $table->timestamps();

            $table->unique(['project_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pm_project_members');
    }
};
