<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\Team;
use App\Models\User;
use Database\Seeders\ProjectManagementPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ProjectTaskTest extends TestCase
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

    private function makeProject(User $creator, ?int $teamId = null): Project
    {
        return Project::create([
            'name' => 'Project ' . uniqid(),
            'status' => 'Active',
            'team_id' => $teamId,
            'start_date' => now()->toDateString(),
            'created_by' => $creator->id,
        ]);
    }

    public function test_team_lead_can_create_a_task_with_multiple_assignees_as_one_row_not_duplicated()
    {
        $team = Team::create(['name' => 'HTML']);
        $teamLead = User::factory()->create(['team_id' => $team->id]);
        $teamLead->assignRole('Team Lead');
        $assigneeOne = User::factory()->create(['team_id' => $team->id]);
        $assigneeTwo = User::factory()->create(['team_id' => $team->id]);

        $project = $this->makeProject($teamLead, $team->id);

        $response = $this->withHeaders($this->authHeaders($teamLead))
            ->postJson("/api/projects/{$project->id}/tasks", [
                'title' => 'Build the login page',
                'assignee_ids' => [$assigneeOne->id, $assigneeTwo->id],
            ]);

        $response->assertStatus(201);
        $taskId = $response->json('data.id');

        $this->assertDatabaseCount('pm_tasks', 1); // one row, not duplicated per assignee
        $this->assertDatabaseCount('pm_task_assignees', 2);
        $this->assertDatabaseHas('pm_task_assignees', ['task_id' => $taskId, 'user_id' => $assigneeOne->id]);
        $this->assertDatabaseHas('pm_task_assignees', ['task_id' => $taskId, 'user_id' => $assigneeTwo->id]);
    }

    public function test_employee_cannot_create_a_task()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');
        $employee = User::factory()->create();
        $employee->assignRole('Employee');

        $project = $this->makeProject($superAdmin);

        $this->withHeaders($this->authHeaders($employee))
            ->postJson("/api/projects/{$project->id}/tasks", ['title' => 'Should Fail'])
            ->assertStatus(403);
    }

    public function test_assignee_can_update_their_own_task_status_but_not_planning_fields()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');
        $assignee = User::factory()->create();
        $assignee->assignRole('Employee');

        $project = $this->makeProject($superAdmin);
        $task = ProjectTask::create([
            'project_id' => $project->id,
            'title' => 'Assigned Task',
            'status' => 'In Progress',
            'created_by' => $superAdmin->id,
        ]);
        $task->assignees()->attach($assignee->id, ['assigned_by' => $superAdmin->id]);

        // Allowed: execution field.
        $statusResponse = $this->withHeaders($this->authHeaders($assignee))
            ->putJson("/api/project-tasks/{$task->id}", ['status' => 'Completed']);
        $statusResponse->assertStatus(200)->assertJsonPath('data.status', 'Completed');

        // Achievement date auto-filled on transition to Completed.
        $this->assertNotNull($statusResponse->json('data.actual_completion_date'));

        // Not allowed: planning field (title) — silently stripped, no permitted fields left.
        $planningResponse = $this->withHeaders($this->authHeaders($assignee))
            ->putJson("/api/project-tasks/{$task->id}", ['title' => 'Renamed By Assignee']);
        $planningResponse->assertStatus(422);
        $this->assertDatabaseHas('pm_tasks', ['id' => $task->id, 'title' => 'Assigned Task']);
    }

    public function test_non_assignee_cannot_update_a_task_merely_by_guessing_its_id()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');
        $stranger = User::factory()->create();
        $stranger->assignRole('Employee');

        $project = $this->makeProject($superAdmin);
        $task = ProjectTask::create([
            'project_id' => $project->id,
            'title' => 'Not Yours',
            'status' => 'In Progress',
            'created_by' => $superAdmin->id,
        ]);

        $this->withHeaders($this->authHeaders($stranger))
            ->putJson("/api/project-tasks/{$task->id}", ['status' => 'Completed'])
            ->assertStatus(403);

        $this->assertDatabaseHas('pm_tasks', ['id' => $task->id, 'status' => 'In Progress']);
    }

    public function test_task_level_coordinator_requires_project_coordinators_department_eligibility()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');

        $project = $this->makeProject($superAdmin);
        $task = ProjectTask::create([
            'project_id' => $project->id,
            'title' => 'Needs A Coordinator',
            'created_by' => $superAdmin->id,
        ]);

        $otherDept = Team::create(['name' => 'PHP']);
        $ineligible = User::factory()->create(['team_id' => $otherDept->id]);

        $response = $this->withHeaders($this->authHeaders($superAdmin))
            ->postJson("/api/project-tasks/{$task->id}/coordinator", ['coordinator_id' => $ineligible->id]);

        $response->assertStatus(422)->assertJsonValidationErrors(['coordinator_id']);
    }

    public function test_task_level_coordinator_overrides_the_project_coordinator()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');

        $pcDept = Team::create(['name' => 'Project Coordinators']);
        $projectCoordinator = User::factory()->create(['team_id' => $pcDept->id]);
        $taskCoordinator = User::factory()->create(['team_id' => $pcDept->id]);

        $project = Project::create([
            'name' => 'Coordinator Override Test',
            'status' => 'Active',
            'start_date' => now()->toDateString(),
            'project_coordinator_id' => $projectCoordinator->id,
            'created_by' => $superAdmin->id,
        ]);
        $task = ProjectTask::create([
            'project_id' => $project->id,
            'title' => 'Override Test Task',
            'created_by' => $superAdmin->id,
        ]);

        $this->withHeaders($this->authHeaders($superAdmin))
            ->postJson("/api/project-tasks/{$task->id}/coordinator", ['coordinator_id' => $taskCoordinator->id])
            ->assertStatus(200);

        $task->refresh();
        $this->assertEquals($taskCoordinator->id, app(\App\Services\ProjectManagement\ProjectAuthorizationService::class)
            ->resolveTaskCoordinator($task)->id);
    }

    public function test_validation_rejects_invalid_task_status_and_malformed_assignee_array()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');
        $project = $this->makeProject($superAdmin);

        $response = $this->withHeaders($this->authHeaders($superAdmin))
            ->postJson("/api/projects/{$project->id}/tasks", [
                'title' => 'Bad Input',
                'status' => 'Not A Real Status',
                'assignee_ids' => 'not-an-array',
            ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['status', 'assignee_ids']);
    }

    public function test_unexpected_request_fields_are_ignored_not_mass_assigned()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');
        $project = $this->makeProject($superAdmin);

        $response = $this->withHeaders($this->authHeaders($superAdmin))
            ->postJson("/api/projects/{$project->id}/tasks", [
                'title' => 'Field Injection Test',
                'is_admin' => true,               // not a real column, must be ignored
                'bug_count' => 999999,             // legacy-shaped field that no longer exists on this table
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('pm_tasks', ['title' => 'Field Injection Test']);
    }
}
