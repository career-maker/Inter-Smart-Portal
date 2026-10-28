<?php

namespace Tests\Feature;

use App\Models\Team;
use App\Models\User;
use App\Support\Access;
use App\Support\Feature;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AccessSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_assigns_privileges_to_people_and_teams_and_can_reset(): void
    {
        Role::firstOrCreate(['name' => 'Super Admin']);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        Feature::set('accounts', true);
        Feature::set('hr_performance', true);
        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');
        $accountsTeam = Team::create(['name' => 'Accounts']);
        $ops = Team::create(['name' => 'Ops']);
        $legacyAccounts = User::factory()->create(['team_id' => $accountsTeam->id]);
        $opsPerson = User::factory()->create(['team_id' => $ops->id]);
        $opsOther = User::factory()->create(['team_id' => $ops->id]);
        $hr = User::factory()->create(['email' => 'hr@intersmart.in', 'team_id' => $ops->id]);

        // defaults: the old rules (Accounts team, HR mailbox)
        $this->assertTrue(Access::accounts($legacyAccounts));
        $this->assertFalse(Access::accounts($opsPerson));
        $this->assertTrue(Access::hr($hr));
        $this->as($legacyAccounts)->getJson('/api/accounts/projects')->assertOk();

        // only the Super Admin can read or change privileges
        $this->as($legacyAccounts)->getJson('/api/access-settings')->assertStatus(403);
        $this->as($opsPerson)->postJson('/api/access-settings', ['key' => 'accounts', 'users' => [$opsPerson->id], 'teams' => []])->assertStatus(403);
        $this->as($admin)->postJson('/api/access-settings', ['key' => 'nonsense', 'users' => [], 'teams' => []])->assertStatus(422);

        // give Accounts to one person in Ops: the choice replaces the old team rule
        $this->as($admin)->postJson('/api/access-settings', ['key' => 'accounts', 'users' => [$opsPerson->id], 'teams' => []])->assertOk();
        $this->assertTrue(Access::accounts($opsPerson));
        $this->assertFalse(Access::accounts($legacyAccounts));
        $this->as($opsPerson)->getJson('/api/accounts/projects')->assertOk();
        $this->as($legacyAccounts)->getJson('/api/accounts/projects')->assertStatus(403);

        // give HR to a whole team
        $this->as($admin)->postJson('/api/access-settings', ['key' => 'hr', 'users' => [], 'teams' => [$ops->id]])->assertOk();
        $this->assertTrue(Access::hr($opsOther));
        $this->as($opsOther)->getJson('/api/hr/performance')->assertOk();

        // the Super Admin sees the current state, then resets to the default rule
        $row = collect($this->as($admin)->getJson('/api/access-settings')->assertOk()->json('privileges'))->firstWhere('key', 'accounts');
        $this->assertTrue($row['customised']);
        $this->as($admin)->postJson('/api/access-settings/reset', ['key' => 'accounts'])->assertOk();
        $this->assertTrue(Access::accounts($legacyAccounts));
        $this->assertFalse(Access::accounts($opsPerson));
    }

    private function as(User $user): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer ' . $user->createToken('t')->plainTextToken);
    }
}
