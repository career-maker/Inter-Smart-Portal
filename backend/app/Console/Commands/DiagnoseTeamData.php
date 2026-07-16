<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Team;
use App\Models\LeaveRequest;

class DiagnoseTeamData extends Command
{
    protected $signature = 'diagnose:team-data';

    protected $description = 'Diagnose Team Lead and team member data in database';

    public function handle()
    {
        $this->info('=== TEAM DATA DIAGNOSIS ==='."\n");

        // 1. Find all Team Leads
        $teamLeads = User::whereHas('roles', function ($q) {
            $q->where('name', 'Team Lead');
        })->get(['id', 'first_name', 'last_name', 'team_id', 'email']);

        $this->info("Found " . $teamLeads->count() . " Team Lead(s):\n");

        if ($teamLeads->isEmpty()) {
            $this->warn("⚠ No Team Leads found in database!");
            return 0;
        }

        foreach ($teamLeads as $tl) {
            $this->line("👤 {$tl->first_name} {$tl->last_name} (ID: {$tl->id})");
            $this->line("   Email: {$tl->email}");
            $this->line("   team_id: " . ($tl->team_id ?? "❌ NULL"));

            // Find teams where this user is team lead
            $teamsLead = Team::where('team_lead_id', $tl->id)->get(['id', 'name', 'code']);

            if ($teamsLead->isEmpty()) {
                $this->warn("   ⚠ Not assigned as team lead to any team");
            } else {
                foreach ($teamsLead as $team) {
                    $this->line("   └─ Team: {$team->name} (ID: {$team->id})");

                    // Check team members
                    $members = User::where('team_id', $team->id)
                        ->where('status', 'Active')
                        ->get(['id', 'first_name', 'last_name']);

                    $this->line("      └─ Members: {$members->count()}");

                    if ($members->isNotEmpty()) {
                        foreach ($members as $member) {
                            $this->line("         • {$member->first_name} {$member->last_name} (ID: {$member->id})");
                        }
                    }

                    // Check pending leave requests for this team
                    $pendingLeaves = LeaveRequest::whereHas('user', function ($q) use ($team) {
                        $q->where('team_id', $team->id);
                    })
                    ->where('tl_status', 'Pending')
                    ->where('status', 'Pending')
                    ->with('user:id,first_name,last_name')
                    ->get();

                    $this->line("      └─ Pending Leaves: {$pendingLeaves->count()}");

                    if ($pendingLeaves->isNotEmpty()) {
                        foreach ($pendingLeaves as $leave) {
                            $this->line("         • {$leave->user->first_name} {$leave->user->last_name} - {$leave->start_date} to {$leave->end_date}");
                        }
                    }
                }
            }

            $this->line("");
        }

        return 0;
    }
}
