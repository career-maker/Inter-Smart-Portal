<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Project Management module — pm_projects.
     *
     * Additive only: new table, references the existing HR `teams` and
     * `users` tables via real foreign keys. No existing HR table is
     * altered by this migration.
     *
     * project_coordinator_id references the existing `users` table
     * directly (no separate Project Coordinator identity/role/table).
     * Eligibility (member of the existing "Project Coordinators" HR
     * department) is enforced in application code at write time, not
     * at the database layer — the FK only guarantees the value is a
     * real user.
     */
    public function up(): void
    {
        Schema::create('pm_projects', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('status')->default('Planning'); // Planning | Active | On Hold | Completed | Cancelled — set explicitly only, never derived from tasks
            $table->string('project_type')->nullable();
            $table->string('category')->nullable();
            $table->foreignId('team_id')->nullable()->constrained('teams')->onDelete('set null'); // optional primary/owning team
            $table->foreignId('project_coordinator_id')->nullable()->constrained('users')->onDelete('set null');
            $table->date('start_date');
            $table->date('expected_end_date')->nullable();
            $table->decimal('allotted_effort', 8, 2)->nullable();
            $table->decimal('confirmed_effort', 8, 2)->nullable();
            $table->decimal('expected_effort', 8, 2)->nullable();
            $table->decimal('committed_effort', 8, 2)->nullable();
            $table->string('hubstaff_project_id')->nullable(); // opaque external reference only, no local FK
            $table->text('blockers')->nullable();
            $table->decimal('budget', 12, 2)->nullable();
            $table->text('live_notes')->nullable();
            $table->text('fixing_notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->softDeletes();
            $table->timestamps();

            $table->index('team_id');
            $table->index('project_coordinator_id');
            $table->index('status');
        });

        // Case/whitespace-insensitive unique project name (Postgres expression index).
        // Prevents the duplicate-named-project data-quality issue documented in the
        // legacy QA Tracker migration notes.
        DB::statement('CREATE UNIQUE INDEX pm_projects_name_unique ON pm_projects (LOWER(TRIM(name))) WHERE deleted_at IS NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('pm_projects');
    }
};
