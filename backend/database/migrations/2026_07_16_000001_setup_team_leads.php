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
        // Assign all Team Leads to the team they are managing
        // Uses raw SQL to ensure team_lead_id matches correctly
        DB::statement('
            UPDATE users u
            JOIN teams t ON t.team_lead_id = u.id
            SET u.team_id = t.id
            WHERE u.team_id IS NULL OR u.team_id != t.id
        ');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No action needed - this is a data assignment migration
    }
};
