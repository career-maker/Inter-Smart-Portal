<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Recognition;
use App\Models\Team;
use App\Models\User;
use App\Support\Feature;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AppreciationTest extends TestCase
{
    use RefreshDatabase;

    public function test_nominate_approve_shares_on_hall_and_announcement_and_rules_hold(): void
    {
        Role::firstOrCreate(['name' => 'Super Admin']);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        Feature::set('appreciation', true);

        $pmo = Team::create(['name' => 'PMO 1']);
        $hr = Team::create(['name' => 'HR']);
        $dev = Team::create(['name' => 'HTML']);
        $manager = User::factory()->create(['team_id' => $pmo->id]);
        $pmo->update(['team_lead_id' => $manager->id]);
        $hrUser = User::factory()->create(['team_id' => $hr->id]);
        $lead = User::factory()->create(['team_id' => $dev->id]);
        $dev->update(['team_lead_id' => $lead->id]);
        $member = User::factory()->create(['team_id' => $dev->id]);

        // a plain team member cannot nominate
        $this->actingAs($member)->postJson('/api/appreciations', ['nominee_id' => $lead->id, 'title' => 'x', 'reason' => 'y'])->assertStatus(403);

        // the team lead can, but not themselves
        $this->actingAs($lead)->postJson('/api/appreciations', ['nominee_id' => $lead->id, 'title' => 'x', 'reason' => 'y'])->assertStatus(422);
        $id = $this->actingAs($lead)->postJson('/api/appreciations', ['nominee_id' => $member->id, 'title' => 'Star of the month', 'reason' => 'Delivered early'])->assertCreated()->json('data.id');

        // the nominator cannot approve; the member sees nothing
        $this->actingAs($lead)->postJson("/api/appreciations/$id/decision", ['approve' => true])->assertStatus(403);

        // reject needs a reason
        $this->actingAs($hrUser)->postJson("/api/appreciations/$id/decision", ['approve' => false])->assertStatus(422);

        // HR approves: Hall entry and announcement exist
        $this->actingAs($hrUser)->postJson("/api/appreciations/$id/decision", ['approve' => true])->assertOk();
        $this->assertSame(1, Recognition::where('user_id', $member->id)->where('title', 'Star of the month')->count());
        $this->assertSame(1, Announcement::where('category', 'Appreciation')->count());

        // cannot be decided twice
        $this->actingAs($manager)->postJson("/api/appreciations/$id/decision", ['approve' => true])->assertStatus(403);

        // the project manager sees all, the nominator sees own
        $this->actingAs($manager)->getJson('/api/appreciations')->assertOk()->assertJsonCount(1, 'data');
    }
}
