<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Create QA team if it doesn't exist
        $qaTeam = DB::table('teams')->where('name', 'Quality Assurance')->first();
        if (!$qaTeam) {
            $qaTeamId = DB::table('teams')->insertGetId([
                'name' => 'Quality Assurance',
                'code' => 'QA-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT),
                'description' => 'Quality Assurance & Testing Team',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $qaTeam = (object)['id' => $qaTeamId];
        }

        // Assign all Team Leads to the QA team if they don't have a team
        $teamLeads = DB::table('users')
            ->join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
            ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
            ->where('roles.name', 'Team Lead')
            ->where('users.team_id', null)
            ->select('users.id')
            ->get();

        foreach ($teamLeads as $lead) {
            DB::table('users')
                ->where('id', $lead->id)
                ->update(['team_id' => $qaTeam->id]);
        }

        // Set the first Team Lead as the team_lead_id if not set
        if (!$qaTeam->team_lead_id) {
            $firstTeamLead = DB::table('users')
                ->join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
                ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
                ->where('roles.name', 'Team Lead')
                ->select('users.id')
                ->first();

            if ($firstTeamLead) {
                DB::table('teams')
                    ->where('id', $qaTeam->id)
                    ->update(['team_lead_id' => $firstTeamLead->id]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration is safe to reverse, but we don't want to delete teams
        // Just remove the team_lead assignments
        DB::table('teams')
            ->where('name', 'Quality Assurance')
            ->update(['team_lead_id' => null]);
    }
};
