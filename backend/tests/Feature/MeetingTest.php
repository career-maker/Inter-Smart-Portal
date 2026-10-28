<?php

namespace Tests\Feature;

use App\Models\Team;
use App\Models\User;
use App\Support\Feature;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class MeetingTest extends TestCase
{
    use RefreshDatabase;

    public function test_schedule_invite_minutes_actions_and_access(): void
    {
        Role::firstOrCreate(['name' => 'Super Admin']);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        Feature::set('meetings', true);
        Mail::fake();

        $team = Team::create(['name' => 'Sales']);
        $org = User::factory()->create(['team_id' => $team->id]);
        $guest = User::factory()->create(['team_id' => $team->id]);
        $outsider = User::factory()->create(['team_id' => $team->id]);

        $body = ['kind' => 'client', 'title' => 'Kickoff', 'starts_at' => '2026-11-02 10:00', 'ends_at' => '2026-11-02 11:00', 'attendee_ids' => [$guest->id], 'external_emails' => ['client@example.com']];

        // end must be after start
        $this->actingAs($org)->postJson('/api/meetings', ['ends_at' => '2026-11-02 09:00'] + $body)->assertStatus(422);

        $id = $this->actingAs($org)->postJson('/api/meetings', $body)->assertCreated()->json('data.id');
        // stored in UTC: 10:00 IST is 04:30 UTC
        $this->assertSame('2026-11-02 04:30:00', \App\Models\Meeting::find($id)->starts_at->format('Y-m-d H:i:s'));

        // outsider cannot see it; guest can, but cannot record minutes
        $this->actingAs($outsider)->getJson("/api/meetings/$id")->assertStatus(403);
        $this->actingAs($guest)->getJson("/api/meetings/$id")->assertOk();
        $this->actingAs($guest)->postJson("/api/meetings/$id/minutes", ['minutes' => 'x'])->assertStatus(403);
        $this->actingAs($guest)->get("/api/meetings/$id/ics")->assertOk()->assertSee('BEGIN:VEVENT', false)->assertSee('DTSTART:20261102T043000Z', false);

        // organiser: minutes mark it Done; follow-up can be ticked by its owner
        $this->actingAs($org)->postJson("/api/meetings/$id/minutes", ['minutes' => 'Agreed scope'])->assertOk()->assertJsonPath('data.status', 'Done');
        $aid = $this->actingAs($org)->postJson("/api/meetings/$id/actions", ['text' => 'Send quote', 'owner_id' => $guest->id])->assertCreated()->json('data.id');
        $this->actingAs($outsider)->putJson("/api/meetings/actions/$aid/toggle")->assertStatus(403);
        $this->actingAs($guest)->putJson("/api/meetings/actions/$aid/toggle")->assertOk()->assertJsonPath('data.done', true);

        // a done meeting cannot be cancelled
        $this->actingAs($org)->postJson("/api/meetings/$id/cancel")->assertStatus(403);
    }
}
