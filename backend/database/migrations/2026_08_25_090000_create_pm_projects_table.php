<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

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
     *
     * name_normalized: a STORED generated column, not a raw partial/
     * expression index. Postgres partial indexes (`CREATE UNIQUE INDEX
     * ... WHERE deleted_at IS NULL`) have no MySQL/MariaDB equivalent —
     * MySQL rejects that syntax outright (SQLSTATE 42000 / 1064).
     * A generated column evaluates to NULL for soft-deleted rows and to
     * the normalized name for active rows; a plain UNIQUE index on that
     * column then enforces "no two ACTIVE projects share a normalized
     * name" — full parity with the original intent, no business rule
     * dropped or weakened — using only standard generated-column +
     * unique-index features supported by MySQL 5.7+/8.0, MariaDB 10.2+,
     * and PostgreSQL 12+ alike, via Laravel's portable storedAs().
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

            // NULL while soft-deleted (deleted_at IS NOT NULL) so a deleted
            // project's name never blocks reuse; the normalized name while
            // active, so two active projects can never share one.
            $table->string('name_normalized', 255)
                ->nullable()
                ->storedAs("CASE WHEN deleted_at IS NULL THEN LOWER(TRIM(name)) ELSE NULL END");

            $table->index('team_id');
            $table->index('project_coordinator_id');
            $table->index('status');
            $table->unique('name_normalized', 'pm_projects_name_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pm_projects');
    }
};
