<?php

namespace Tests\Feature;

use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/** Audit 15 Nov 2026 fixes: admin-only password reset, leave-type and leave-ledger access, Team Lead data scope. */
class AuditHardeningTest extends TestCase
{
    use RefreshDatabase;

    private function actor(string $role, ?int $teamId = null): User
    {
        Role::firstOrCreate(['name' => $role]);
        $user = User::factory()->create(['team_id' => $teamId]);
        $user->assignRole($role);

        return $user;
    }

    private function as(User $user)
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer ' . $user->createToken('t')->plainTextToken);
    }

    public function test_only_an_admin_can_reset_a_password_and_it_needs_ten_characters(): void
    {
        $target = $this->actor('Employee');
        $payload = ['password' => 'a-long-enough-pass', 'password_confirmation' => 'a-long-enough-pass'];

        $this->as($this->actor('Team Lead'))->postJson("/api/employees/{$target->id}/password", $payload)->assertStatus(403);
        $this->as($this->actor('Employee'))->postJson("/api/employees/{$target->id}/password", $payload)->assertStatus(403);

        $admin = $this->actor('Super Admin');
        $this->as($admin)->postJson("/api/employees/{$target->id}/password", ['password' => 'short', 'password_confirmation' => 'short'])->assertStatus(422);
        $this->as($admin)->postJson("/api/employees/{$target->id}/password", $payload)->assertOk();
    }

    public function test_team_lead_cannot_change_leave_types_and_employee_cannot_read_the_leave_ledger(): void
    {
        $lead = $this->actor('Team Lead');
        $this->as($lead)->postJson('/api/leave-types', ['name' => 'X', 'days_allowed_per_year' => 1])->assertStatus(403);
        $this->as($this->actor('Employee'))->getJson('/api/leave-policy/ledger')->assertStatus(403);
        $this->as($this->actor('Super Admin'))->getJson('/api/leave-policy/ledger')->assertOk();
    }

    public function test_team_lead_report_covers_only_own_team_and_hides_personal_fields(): void
    {
        $teamA = Team::create(['name' => 'Team A', 'code' => 'TA-1']);
        $teamB = Team::create(['name' => 'Team B', 'code' => 'TB-1']);
        $lead = $this->actor('Team Lead', $teamA->id);
        $teamA->update(['team_lead_id' => $lead->id]);
        $mine = $this->actor('Employee', $teamA->id);
        $other = $this->actor('Employee', $teamB->id);

        $rows = $this->as($lead)->getJson('/api/reports/employees')->assertOk()->json('data');
        $ids = collect($rows)->pluck('id');
        $this->assertTrue($ids->contains($mine->id));
        $this->assertFalse($ids->contains($other->id));
        $this->assertArrayNotHasKey('dob', $rows[0]);
        $this->assertArrayNotHasKey('permanent_address', $rows[0]);

        $this->as($lead)->getJson("/api/employees/{$other->id}")->assertStatus(403);
        $this->as($lead)->getJson("/api/employees/{$mine->id}")->assertOk();
    }
}
