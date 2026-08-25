<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Team;
use App\Models\User;
use Database\Seeders\ProjectManagementPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Covers the Stage 7 "CRITICAL ROLE RULE" / "PROJECT COORDINATOR RULE":
 * exactly three HR roles exist, Project Coordinator is a data
 * relationship (department eligibility + FK), never a role or a
 * permission, and object-level access can't be bypassed by editing an
 * ID in the request.
 */
class ProjectAuthorizationTest extends TestCase
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

    public function test_unauthenticated_user_cannot_access_pm_api()
    {
        $this->getJson('/api/projects')->assertStatus(401);
        $this->postJson('/api/projects', [])->assertStatus(401);
        $this->getJson('/api/project-tasks/my')->assertStatus(401);
    }

    public function test_employee_cannot_create_a_project()
    {
        $employee = User::factory()->create();
        $employee->assignRole('Employee');

        $response = $this->withHeaders($this->authHeaders($employee))->postJson('/api/projects', [
            'name' => 'Employee Attempt',
            'start_date' => now()->toDateString(),
        ]);

        $response->assertStatus(403);
    }

    public function test_team_lead_cannot_manage_hubstaff_permission()
    {
        $teamLead = User::factory()->create();
        $teamLead->assignRole('Team Lead');

        $this->assertFalse($teamLead->can('manage hubstaff'));
        $this->assertFalse($teamLead->can('manage sub phases'));
        $this->assertFalse($teamLead->can('manage project settings'));
        $this->assertTrue($teamLead->can('manage projects'));
    }

    public function test_team_lead_cannot_edit_another_teams_project_by_changing_the_id()
    {
        $teamA = Team::create(['name' => 'Team A']);
        $teamB = Team::create(['name' => 'Team B']);

        $leadA = User::factory()->create(['team_id' => $teamA->id]);
        $leadA->assignRole('Team Lead');

        $otherTeamsProject = Project::create([
            'name' => 'Team B Project',
            'status' => 'Active',
            'team_id' => $teamB->id,
            'start_date' => now()->toDateString(),
            'created_by' => $leadA->id,
        ]);

        // Team A's lead tries to edit Team B's project purely by guessing its ID.
        $response = $this->withHeaders($this->authHeaders($leadA))
            ->putJson("/api/projects/{$otherTeamsProject->id}", ['name' => 'Hijacked']);

        $response->assertStatus(403);
        $this->assertDatabaseHas('pm_projects', ['id' => $otherTeamsProject->id, 'name' => 'Team B Project']);
    }

    public function test_non_project_coordinators_department_employee_cannot_be_assigned_as_coordinator()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');

        $otherDept = Team::create(['name' => 'HTML']);
        $ineligible = User::factory()->create(['team_id' => $otherDept->id]);

        $response = $this->withHeaders($this->authHeaders($superAdmin))->postJson('/api/projects', [
            'name' => 'Coordinator Eligibility Test',
            'start_date' => now()->toDateString(),
            'project_coordinator_id' => $ineligible->id,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['project_coordinator_id']);
    }

    public function test_project_coordinators_department_employee_can_be_assigned_as_coordinator()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');

        $pcDept = Team::create(['name' => 'Project Coordinators']);
        $eligible = User::factory()->create(['team_id' => $pcDept->id]);
        $eligible->assignRole('Employee');

        $response = $this->withHeaders($this->authHeaders($superAdmin))->postJson('/api/projects', [
            'name' => 'Coordinator Eligibility Test 2',
            'start_date' => now()->toDateString(),
            'project_coordinator_id' => $eligible->id,
        ]);

        $response->assertStatus(201)->assertJsonPath('data.project_coordinator_id', $eligible->id);
    }

    public function test_project_coordinator_status_does_not_grant_a_new_role_or_any_hr_administration_capability()
    {
        $pcDept = Team::create(['name' => 'Project Coordinators']);
        $coordinator = User::factory()->create(['team_id' => $pcDept->id]);
        $coordinator->assignRole('Employee');

        Project::create([
            'name' => 'Coordinated Project',
            'status' => 'Active',
            'start_date' => now()->toDateString(),
            'project_coordinator_id' => $coordinator->id,
            'created_by' => $coordinator->id,
        ]);

        $coordinator->refresh();

        // Still exactly one role: Employee. Being a coordinator granted no new role.
        $this->assertEquals(['Employee'], $coordinator->getRoleNames()->toArray());

        // No PM management permission, no HR-admin capability, purely from being a coordinator.
        $this->assertFalse($coordinator->can('manage projects'));
        $this->assertFalse($coordinator->can('manage employees'));
        $this->assertFalse($coordinator->hasRole('Super Admin'));
        $this->assertFalse($coordinator->hasRole('Team Lead'));
    }

    public function test_team_lead_who_is_also_a_project_coordinator_keeps_exactly_their_team_lead_capabilities()
    {
        $team = Team::create(['name' => 'PHP']);
        $pcDept = Team::create(['name' => 'Project Coordinators']);

        // A Team Lead who happens to sit in the Project Coordinators department.
        $teamLeadCoordinator = User::factory()->create(['team_id' => $pcDept->id]);
        $teamLeadCoordinator->assignRole('Team Lead');

        $otherTeamProject = Project::create([
            'name' => 'Not Their Team',
            'status' => 'Active',
            'team_id' => $team->id,
            'start_date' => now()->toDateString(),
            'created_by' => $teamLeadCoordinator->id,
        ]);

        // Coordinating a project does NOT grant edit rights over an unrelated
        // project outside their team merely because they are a Team Lead.
        $response = $this->withHeaders($this->authHeaders($teamLeadCoordinator))
            ->putJson("/api/projects/{$otherTeamProject->id}", ['name' => 'Should Not Work']);

        $response->assertStatus(403);

        // No "Project Coordinator Team Lead" role was ever created.
        $this->assertEquals(['Team Lead'], $teamLeadCoordinator->getRoleNames()->toArray());
    }
}
