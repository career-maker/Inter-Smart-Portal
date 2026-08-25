<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Team;
use App\Models\User;
use Database\Seeders\ProjectManagementPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ProjectTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'Super Admin']);
        Role::firstOrCreate(['name' => 'Team Lead']);
        Role::firstOrCreate(['name' => 'Employee']);
        $this->seed(ProjectManagementPermissionsSeeder::class);
    }

    private function authHeaders(User $user): array
    {
        return ['Authorization' => 'Bearer ' . $user->createToken('auth_token')->plainTextToken];
    }

    public function test_super_admin_can_create_a_project()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');

        $response = $this->withHeaders($this->authHeaders($superAdmin))->postJson('/api/projects', [
            'name' => 'New Portal Redesign',
            'description' => 'Q1 redesign work.',
            'start_date' => now()->toDateString(),
        ]);

        $response->assertStatus(201)->assertJsonPath('data.name', 'New Portal Redesign');
        $this->assertDatabaseHas('pm_projects', ['name' => 'New Portal Redesign', 'created_by' => $superAdmin->id]);
    }

    public function test_team_lead_creating_a_project_is_scoped_to_their_own_team_by_default()
    {
        $team = Team::create(['name' => 'React']);
        $teamLead = User::factory()->create(['team_id' => $team->id]);
        $teamLead->assignRole('Team Lead');

        $response = $this->withHeaders($this->authHeaders($teamLead))->postJson('/api/projects', [
            'name' => 'React Team Project',
            'start_date' => now()->toDateString(),
        ]);

        $response->assertStatus(201)->assertJsonPath('data.team_id', $team->id);
    }

    public function test_team_lead_cannot_create_a_project_for_a_different_team()
    {
        $ownTeam = Team::create(['name' => 'React']);
        $otherTeam = Team::create(['name' => 'PHP']);
        $teamLead = User::factory()->create(['team_id' => $ownTeam->id]);
        $teamLead->assignRole('Team Lead');

        $response = $this->withHeaders($this->authHeaders($teamLead))->postJson('/api/projects', [
            'name' => 'Cross-Team Attempt',
            'start_date' => now()->toDateString(),
            'team_id' => $otherTeam->id,
        ]);

        $response->assertStatus(403);
    }

    public function test_duplicate_active_project_names_are_rejected_at_the_database_layer()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');

        Project::create([
            'name' => 'Duplicate Name',
            'status' => 'Active',
            'start_date' => now()->toDateString(),
            'created_by' => $superAdmin->id,
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);

        Project::create([
            'name' => 'duplicate name', // case/whitespace-insensitive collision
            'status' => 'Active',
            'start_date' => now()->toDateString(),
            'created_by' => $superAdmin->id,
        ]);
    }

    public function test_validation_rejects_invalid_status_and_missing_required_fields()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');

        $response = $this->withHeaders($this->authHeaders($superAdmin))->postJson('/api/projects', [
            'name' => 'Bad Status',
            'status' => 'NotARealStatus',
            // start_date deliberately omitted — required
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['status', 'start_date']);
    }

    public function test_validation_rejects_an_oversized_name()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');

        $response = $this->withHeaders($this->authHeaders($superAdmin))->postJson('/api/projects', [
            'name' => str_repeat('A', 300), // over the 255 limit
            'start_date' => now()->toDateString(),
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['name']);
    }

    public function test_validation_rejects_an_invalid_nonexistent_foreign_key()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');

        $response = $this->withHeaders($this->authHeaders($superAdmin))->postJson('/api/projects', [
            'name' => 'Bad FK',
            'start_date' => now()->toDateString(),
            'team_id' => 999999, // does not exist
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['team_id']);
    }

    /** Mass-assignment protection: a client cannot forge who created a project. */
    public function test_client_cannot_forge_created_by_via_mass_assignment()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');
        $victim = User::factory()->create();

        $response = $this->withHeaders($this->authHeaders($superAdmin))->postJson('/api/projects', [
            'name' => 'Forged Authorship Attempt',
            'start_date' => now()->toDateString(),
            'created_by' => $victim->id, // not a validated/fillable-from-client field
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('pm_projects', [
            'name' => 'Forged Authorship Attempt',
            'created_by' => $superAdmin->id, // always the real actor, never the submitted value
        ]);
    }

    /** HTML/script payloads are stored as inert text via parameter binding — never executed, never break the row. */
    public function test_html_and_script_payloads_are_stored_as_plain_text_not_executed()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');

        $payload = '<script>alert(1)</script><img src=x onerror=alert(2)>';

        $response = $this->withHeaders($this->authHeaders($superAdmin))->postJson('/api/projects', [
            'name' => 'XSS Storage Test',
            'description' => $payload,
            'start_date' => now()->toDateString(),
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('pm_projects', ['name' => 'XSS Storage Test', 'description' => $payload]);
    }

    /** SQL-injection-style strings are treated as plain data via Eloquent parameter binding — never concatenated into SQL. */
    public function test_sql_injection_style_input_is_treated_as_plain_data()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');

        $payload = "Robert'); DROP TABLE pm_projects;--";

        $response = $this->withHeaders($this->authHeaders($superAdmin))->postJson('/api/projects', [
            'name' => $payload,
            'start_date' => now()->toDateString(),
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('pm_projects', ['name' => $payload]);
        // The table still exists and is queryable — nothing was executed as SQL.
        $this->assertDatabaseCount('pm_projects', 1);
    }

    public function test_unauthorized_user_cannot_view_a_project_they_are_not_related_to()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');
        $stranger = User::factory()->create();
        $stranger->assignRole('Employee');

        $project = Project::create([
            'name' => 'Private Project',
            'status' => 'Active',
            'start_date' => now()->toDateString(),
            'created_by' => $superAdmin->id,
        ]);

        $this->withHeaders($this->authHeaders($stranger))
            ->getJson("/api/projects/{$project->id}")
            ->assertStatus(403);
    }

    public function test_member_can_view_a_project_they_belong_to()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');
        $member = User::factory()->create();
        $member->assignRole('Employee');

        $project = Project::create([
            'name' => 'Member Visible Project',
            'status' => 'Active',
            'start_date' => now()->toDateString(),
            'created_by' => $superAdmin->id,
        ]);
        $project->members()->attach($member->id, ['project_role' => 'Member', 'added_by' => $superAdmin->id]);

        $this->withHeaders($this->authHeaders($member))
            ->getJson("/api/projects/{$project->id}")
            ->assertStatus(200);
    }

    public function test_project_archive_is_a_soft_delete_not_a_hard_delete()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');

        $project = Project::create([
            'name' => 'Archive Me',
            'status' => 'Active',
            'start_date' => now()->toDateString(),
            'created_by' => $superAdmin->id,
        ]);

        $this->withHeaders($this->authHeaders($superAdmin))
            ->deleteJson("/api/projects/{$project->id}")
            ->assertStatus(200);

        $this->assertSoftDeleted('pm_projects', ['id' => $project->id]);
    }
}
