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
        // Assign Team Leads to their own teams (where they are team_lead_id)
        // This handles cases where a Team Lead exists but doesn't have team_id set
        $teamLeads = DB::table('users')
            ->join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
            ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
            ->where('roles.name', 'Team Lead')
            ->where('users.team_id', null)
            ->select('users.id')
            ->get();

        foreach ($teamLeads as $lead) {
            // Find the team where this user is the team_lead_id
            $team = DB::table('teams')
                ->where('team_lead_id', $lead->id)
                ->first();

            if ($team) {
                // Assign the Team Lead to their own team
                DB::table('users')
                    ->where('id', $lead->id)
                    ->update(['team_id' => $team->id]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No action needed - this is a data assignment migration
    }
};
