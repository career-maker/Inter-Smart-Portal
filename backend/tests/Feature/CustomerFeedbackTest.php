<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Team;
use App\Models\User;
use App\Support\Feature;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class CustomerFeedbackTest extends TestCase
{
    use RefreshDatabase;

    public function test_manager_records_during_hr_records_after_live_and_others_are_refused(): void
    {
        Role::firstOrCreate(['name' => 'Super Admin']);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        Feature::set('customer_feedback', true);

        $pmo = Team::create(['name' => 'PMO 1']);
        $hr = Team::create(['name' => 'HR']);
        $dev = Team::create(['name' => 'HTML']);
        $manager = User::factory()->create(['team_id' => $pmo->id]);
        $pmo->update(['team_lead_id' => $manager->id]);
        $hrUser = User::factory()->create(['team_id' => $hr->id]);
        $member = User::factory()->create(['team_id' => $dev->id]);
        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');
        $project = Project::create(['name' => 'Acme', 'status' => 'Active', 'start_date' => now()->toDateString(), 'created_by' => $admin->id]);

        $body = ['project_id' => $project->id, 'contact_name' => 'Mr Rao', 'call_date' => now()->toDateString(), 'score' => 4, 'notes' => 'Happy with design'];

        $this->actingAs($member)->getJson('/api/customer-feedback')->assertStatus(403);
        $this->actingAs($member)->postJson('/api/customer-feedback', $body + ['stage' => 'during'])->assertStatus(403);

        // manager: during yes, post-live no
        $this->actingAs($manager)->postJson('/api/customer-feedback', $body + ['stage' => 'during'])->assertCreated();
        $this->actingAs($manager)->postJson('/api/customer-feedback', $body + ['stage' => 'post_live'])->assertStatus(403);

        // HR: during no; post-live refused until the project is live, then allowed
        $this->actingAs($hrUser)->postJson('/api/customer-feedback', $body + ['stage' => 'during'])->assertStatus(403);
        $this->actingAs($hrUser)->postJson('/api/customer-feedback', $body + ['stage' => 'post_live'])->assertStatus(403);
        DB::table('project_go_live')->insert(['project_id' => $project->id, 'status' => 'Live', 'created_at' => now(), 'updated_at' => now()]);
        $this->actingAs($hrUser)->postJson('/api/customer-feedback', $body + ['stage' => 'post_live'])->assertCreated();

        // score range and both roles read everything
        $this->actingAs($hrUser)->postJson('/api/customer-feedback', ['score' => 9] + $body + ['stage' => 'post_live'])->assertStatus(422);
        $this->actingAs($hrUser)->getJson('/api/customer-feedback')->assertOk()->assertJsonCount(2, 'data');
    }
}
