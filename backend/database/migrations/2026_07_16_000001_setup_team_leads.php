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
        // Uses PostgreSQL syntax for UPDATE with FROM clause
        DB::statement('
            UPDATE users u
            SET team_id = t.id
            FROM teams t
            WHERE t.team_lead_id = u.id
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
