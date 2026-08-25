<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Project Management module — pm_sub_phases.
     *
     * Global (team_id NULL) + optional team-specific taxonomy, per the
     * finalized design (Decision 4). References the existing HR `teams`
     * table; no new team/department concept is introduced.
     *
     * scope_key: a STORED generated column replacing what would
     * otherwise need two Postgres-only partial unique indexes (one
     * scoped `WHERE team_id IS NOT NULL`, one `WHERE team_id IS NULL`)
     * — MySQL/MariaDB have no partial-index equivalent and reject that
     * syntax outright. A plain composite UNIQUE(team_id, name) doesn't
     * work either: SQL treats every NULL team_id as distinct from every
     * other NULL, so it would silently let duplicate *global* names
     * through. Collapsing team_id (or a '0' sentinel for global rows,
     * which never collides with a real auto-increment team id) and the
     * normalized name into one generated string, then putting a single
     * plain UNIQUE index on it, correctly enforces "unique per team, and
     * unique among global entries" with standard portable SQL only.
     */
    public function up(): void
    {
        Schema::create('pm_sub_phases', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('team_id')->nullable()->constrained('teams')->onDelete('cascade'); // NULL = global
            $table->text('description')->nullable();
            $table->integer('display_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->string('scope_key', 300)
                ->nullable()
                ->storedAs("CONCAT(COALESCE(team_id, 0), '|', LOWER(TRIM(name)))");

            $table->index('team_id');
            $table->unique('scope_key', 'pm_sub_phases_scope_name_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pm_sub_phases');
    }
};
