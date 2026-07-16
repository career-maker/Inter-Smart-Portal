<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Fix any Team Leads that don't have their team_id set
        // This ensures Team Leads can see their team's status and approve requests
        DB::statement('
            UPDATE users u
            SET team_id = t.id
            FROM teams t
            WHERE t.team_lead_id = u.id
            AND u.team_id IS NULL
        ');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No action needed - this only sets missing team_id values
    }
};
