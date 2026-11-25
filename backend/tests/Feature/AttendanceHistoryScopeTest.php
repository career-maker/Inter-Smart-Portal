<?php

namespace Tests\Feature;

use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/** 25 Nov 2026: every employee sees their own attendance history; Team Leads also see their team. */
class AttendanceHistoryScopeTest extends TestCase
{
    use RefreshDatabase;

    private function actor(string $role, ?int $teamId = null): User
    {
        Role::firstOrCreate(['name' => $role]);
        $user = User::factory()->create(['team_id' => $teamId, 'status' => 'Active']);
        $user->assignRole($role);

        return $user;
    }

    private function as(User $user)
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer ' . $user->createToken('t')->plainTextToken);
    }

    private function summaryIds(User $user, ?int $userId = null): array
    {
        $query = 'start_date=2026-11-01&end_date=2026-11-03' . ($userId ? "&user_id={$userId}" : '');

        return collect($this->as($user)->getJson("/api/reports/attendance-summary?{$query}")->assertOk()->json('data'))
            ->pluck('id')->sort()->values()->all();
    }

    public function test_employee_sees_only_own_history_and_lead_sees_team(): void
    {
        $teamA = Team::create(['name' => 'Team A', 'code' => 'TA-1']);
        $teamB = Team::create(['name' => 'Team B', 'code' => 'TB-1']);
        $lead = $this->actor('Team Lead', $teamA->id);
        $teamA->update(['team_lead_id' => $lead->id]);
        $member = $this->actor('Employee', $teamA->id);
        $peer = $this->actor('Employee', $teamA->id);
        $other = $this->actor('Employee', $teamB->id);

        // Employee: own row only, even when asking for a teammate.
        $this->assertSame([$member->id], $this->summaryIds($member));
        $this->assertSame([], $this->summaryIds($member, $peer->id));
        $this->as($member)->getJson("/api/attendance/details?date=2026-11-02&user_id={$peer->id}")->assertStatus(403);
        $this->as($member)->getJson("/api/attendance/details?date=2026-11-02")->assertOk();

        // Team Lead: self + own team, never another team.
        $this->assertSame(collect([$lead->id, $member->id, $peer->id])->sort()->values()->all(), $this->summaryIds($lead));
        $this->assertSame([], $this->summaryIds($lead, $other->id));
        $this->as($lead)->getJson("/api/attendance/details?date=2026-11-02&user_id={$member->id}")->assertOk();
        $this->as($lead)->getJson("/api/attendance/details?date=2026-11-02&user_id={$other->id}")->assertStatus(403);

        // Super Admin unchanged: everyone.
        $this->assertContains($other->id, $this->summaryIds($this->actor('Super Admin')));
    }
}
