<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Team;
use App\Models\User;

class TeamLeadSeeder extends Seeder
{
    public function run(): void
    {
        // Find or create a QA team
        $qaTeam = Team::firstOrCreate(
            ['name' => 'Quality Assurance'],
            [
                'code' => 'QA-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT),
                'description' => 'Quality Assurance & Testing Team'
            ]
        );

        // Find Team Leads without a team and assign them
        $teamLeads = User::role('Team Lead')->get();

        foreach ($teamLeads as $lead) {
            if (!$lead->team_id) {
                // Assign team_id to the team they should be leading
                $lead->update(['team_id' => $qaTeam->id]);
            }

            // Make sure they're set as team_lead_id if they're managing this team
            if (!$qaTeam->team_lead_id) {
                $qaTeam->update(['team_lead_id' => $lead->id]);
            }
        }

        $this->command->info('Team Lead assignments completed.');
    }
}
