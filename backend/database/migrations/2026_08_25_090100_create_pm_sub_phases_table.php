<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Project Management module — pm_sub_phases.
     *
     * Global (team_id NULL) + optional team-specific taxonomy, per the
     * finalized design (Decision 4). References the existing HR `teams`
     * table; no new team/department concept is introduced.
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

            $table->index('team_id');
        });

        // Two partial unique indexes (Postgres): a plain composite unique on
        // (name, team_id) would NOT actually prevent duplicate global rows,
        // since SQL NULLs are never equal to each other. These enforce
        // uniqueness correctly for both the global and per-team cases.
        DB::statement('CREATE UNIQUE INDEX pm_sub_phases_team_name_unique ON pm_sub_phases (team_id, LOWER(TRIM(name))) WHERE team_id IS NOT NULL');
        DB::statement('CREATE UNIQUE INDEX pm_sub_phases_global_name_unique ON pm_sub_phases (LOWER(TRIM(name))) WHERE team_id IS NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('pm_sub_phases');
    }
};
