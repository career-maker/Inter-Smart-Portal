<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectBudgetAllocation;
use App\Models\ProjectFinance;
use App\Models\ProjectPayment;
use App\Models\Team;
use App\Models\User;
use App\Models\WorkChange;
use App\Support\Feature;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ChangeWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;
    private User $coordinator;
    private User $lead;
    private User $dev;
    private User $outsider;
    private Project $project;
    private Team $html;

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'Super Admin']);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        Feature::set('workflow', true);

        $pmo = Team::create(['name' => 'PMO 1']);
        $this->html = Team::create(['name' => 'HTML']);
        $other = Team::create(['name' => 'Sales']);
        $this->manager = User::factory()->create(['team_id' => $pmo->id]);
        $pmo->update(['team_lead_id' => $this->manager->id]);
        $this->coordinator = User::factory()->create(['team_id' => $pmo->id]);
        $this->lead = User::factory()->create(['team_id' => $this->html->id]);
        $this->html->update(['team_lead_id' => $this->lead->id]);
        $this->dev = User::factory()->create(['team_id' => $this->html->id]);
        $this->outsider = User::factory()->create(['team_id' => $other->id]);
        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');

        $this->project = Project::create(['name' => 'Acme', 'status' => 'Active', 'start_date' => now()->toDateString(), 'created_by' => $admin->id, 'project_coordinator_id' => $this->coordinator->id]);
        ProjectFinance::create(['project_id' => $this->project->id, 'contract_value' => 100000]);
        ProjectPayment::create(['project_id' => $this->project->id, 'kind' => 'advance', 'amount' => 30000, 'status' => 'Approved']);
        ProjectBudgetAllocation::create(['project_id' => $this->project->id, 'team_id' => $this->html->id, 'amount' => 5000]);
    }

    private function as(User $user): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer ' . $user->createToken('t')->plainTextToken);
    }

    private function raise(): int
    {
        return $this->as($this->coordinator)->postJson("/api/work/projects/{$this->project->id}/changes", ['team_id' => $this->html->id, 'kind' => 'Correction', 'title' => 'Fix footer'])->assertCreated()->json('data.id');
    }

    public function test_only_coordinator_or_manager_raises_and_department_must_have_budget(): void
    {
        $url = "/api/work/projects/{$this->project->id}/changes";
        $this->as($this->lead)->postJson($url, ['team_id' => $this->html->id, 'kind' => 'Change', 'title' => 'x'])->assertForbidden();
        $this->as($this->coordinator)->postJson($url, ['team_id' => $this->outsider->team_id, 'kind' => 'Change', 'title' => 'x'])->assertStatus(422);
        $this->raise();
        $this->assertSame(1, WorkChange::count());
    }

    public function test_full_flow_estimate_approve_assign_complete(): void
    {
        $id = $this->raise();
        $this->as($this->dev)->postJson("/api/work/changes/{$id}/estimate", ['effort_days' => 2, 'cost_estimate' => 1000])->assertForbidden();
        $this->as($this->lead)->postJson("/api/work/changes/{$id}/estimate", ['effort_days' => 2, 'cost_estimate' => 1000])->assertOk();
        $this->as($this->lead)->postJson("/api/work/changes/{$id}/decision", ['decision' => 'approve'])->assertForbidden();
        $this->as($this->manager)->postJson("/api/work/changes/{$id}/decision", ['decision' => 'approve'])->assertOk();
        $this->as($this->lead)->postJson("/api/work/changes/{$id}/assign", ['assigned_to' => $this->outsider->id])->assertStatus(422);
        $this->as($this->lead)->postJson("/api/work/changes/{$id}/assign", ['assigned_to' => $this->dev->id])->assertOk();
        $this->as($this->dev)->postJson("/api/work/changes/{$id}/progress", ['status' => 'Completed', 'time_spent_days' => 1.5])->assertOk();

        $c = WorkChange::find($id);
        $this->assertSame('Completed', $c->status);
        $this->assertNotNull($c->completed_at);
        $this->assertTrue($this->coordinator->notifications()->get()->pluck('data.event')->contains('change_completed'));
    }

    public function test_reject_needs_reason_and_can_be_re_estimated(): void
    {
        $id = $this->raise();
        $this->as($this->lead)->postJson("/api/work/changes/{$id}/estimate", ['effort_days' => 2, 'cost_estimate' => 1000])->assertOk();
        $this->as($this->manager)->postJson("/api/work/changes/{$id}/decision", ['decision' => 'reject'])->assertStatus(422)->assertJsonPath('errors.note.0', 'Give a reason when rejecting.');
        $this->as($this->manager)->postJson("/api/work/changes/{$id}/decision", ['decision' => 'reject', 'note' => 'Too costly'])->assertOk();
        $this->as($this->lead)->postJson("/api/work/changes/{$id}/estimate", ['effort_days' => 1, 'cost_estimate' => 400])->assertOk();
        $this->assertSame('Estimated', WorkChange::find($id)->status);
    }

    public function test_over_budget_needs_confirmation_and_tells_super_admin(): void
    {
        $id = $this->raise();
        $this->as($this->lead)->postJson("/api/work/changes/{$id}/estimate", ['effort_days' => 9, 'cost_estimate' => 9000])->assertOk();
        $this->as($this->manager)->postJson("/api/work/changes/{$id}/decision", ['decision' => 'approve'])->assertStatus(422)->assertJsonPath('over_budget', true);
        $this->assertSame('Estimated', WorkChange::find($id)->status);
        $this->as($this->manager)->postJson("/api/work/changes/{$id}/decision", ['decision' => 'approve', 'allow_over_budget' => true])->assertOk();
        $this->assertSame('Approved', WorkChange::find($id)->status);
    }

    public function test_finishing_over_effort_needs_a_reason_and_alerts_managers(): void
    {
        $id = $this->raise();
        $this->as($this->lead)->postJson("/api/work/changes/{$id}/estimate", ['effort_days' => 1, 'cost_estimate' => 500])->assertOk();
        $this->as($this->manager)->postJson("/api/work/changes/{$id}/decision", ['decision' => 'approve'])->assertOk();
        $this->as($this->lead)->postJson("/api/work/changes/{$id}/assign", ['assigned_to' => $this->dev->id])->assertOk();
        $this->as($this->dev)->postJson("/api/work/changes/{$id}/progress", ['status' => 'Completed', 'time_spent_days' => 3])->assertStatus(422);
        $this->as($this->dev)->postJson("/api/work/changes/{$id}/progress", ['status' => 'Completed', 'time_spent_days' => 3, 'note' => 'Client sent new images'])->assertOk();
        $this->assertTrue($this->manager->notifications()->get()->pluck('data.event')->contains('change_over_effort'));
    }

    public function test_outsiders_cannot_see_the_list(): void
    {
        $this->as($this->outsider)->getJson("/api/work/projects/{$this->project->id}/changes")->assertForbidden();
        $this->as($this->dev)->getJson("/api/work/projects/{$this->project->id}/changes")->assertOk()->assertJsonPath('departments.0.left', 5000);
    }
}
