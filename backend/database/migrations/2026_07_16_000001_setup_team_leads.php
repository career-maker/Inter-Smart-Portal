<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Assign all Team Leads to the team they are managing
        DB::statement('
            UPDATE users u
            JOIN teams t ON t.team_lead_id = u.id
            SET u.team_id = t.id
        ');
    }

    public function down(): void
    {
        // No action needed
    }
};
