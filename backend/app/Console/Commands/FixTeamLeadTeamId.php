<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Team;
use Illuminate\Support\Facades\DB;

class FixTeamLeadTeamId extends Command
{
    protected $signature = 'fix:team-lead-team-id';

    protected $description = 'Assign team_id to all Team Leads based on their team_lead_id';

    public function handle()
    {
        $this->info('Fixing Team Lead team_id assignments...');

        try {
            // Get all teams with team leads
            $teams = Team::whereNotNull('team_lead_id')->get();

            $fixedCount = 0;

            foreach ($teams as $team) {
                $user = User::find($team->team_lead_id);

                if ($user) {
                    if ($user->team_id !== $team->id) {
                        $user->update(['team_id' => $team->id]);
                        $this->line("✓ Updated {$user->first_name} {$user->last_name} -> Team: {$team->name}");
                        $fixedCount++;
                    } else {
                        $this->line("✓ {$user->first_name} {$user->last_name} already assigned to {$team->name}");
                    }
                } else {
                    $this->warn("⚠ Team {$team->name} has invalid team_lead_id: {$team->team_lead_id}");
                }
            }

            $this->info("\n✅ Fixed $fixedCount Team Lead assignments");

            // Also verify team members have correct team_id
            $this->info("\nVerifying team member assignments...');

            $membersWithoutTeam = User::whereNull('team_id')
                ->where('status', 'Active')
                ->get();

            if ($membersWithoutTeam->count() > 0) {
                $this->warn("⚠ Found {$membersWithoutTeam->count()} active users without a team assignment");
                $this->line("These users should be assigned to a team via the Teams interface.");
            } else {
                $this->info("✓ All active users have team assignments");
            }

        } catch (\Exception $e) {
            $this->error('Error: ' . $e->getMessage());
            return 1;
        }

        return 0;
    }
}
