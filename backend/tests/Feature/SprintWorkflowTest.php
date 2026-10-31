<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectBudgetAllocation;
use App\Models\ProjectFinance;
use App\Models\ProjectPayment;
use App\Models\Team;
use App\Models\User;
use App\Models\WorkSprint;
use App\Support\Feature;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class SprintWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;
    private User $coordinator;
    private User $lead;       // HTML team lead
    private User $dev;        // HTML member
    private User $dev2;       // HTML member
    private User $designer;   // Design member
    private User $admin;
    private Project $project;
    private Team $html;
    private Team $design;

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'Super Admin']);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        Feature::set('workflow', true);

        $pmo = Team::create(['name' => 'PMO 1']);
        $this->html = Team::create(['name' => 'HTML']);
        $this->design = Team::create(['name' => 'Design']);
        $this->manager = User::factory()->create(['team_id' => $pmo->id]);
        $pmo->update(['team_lead_id' => $this->manager->id]);
        $this->coordinator = User::factory()->create(['team_id' => $pmo->id]);
        $this->lead = User::factory()->create(['team_id' => $this->html->id]);
        $this->html->update(['team_lead_id' => $this->lead->id]);
        $this->dev = User::factory()->create(['team_id' => $this->html->id]);
        $this->dev2 = User::factory()->create(['team_id' => $this->html->id]);
        $this->designer = User::factory()->create(['team_id' => $this->design->id]);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('Super Admin');

        $this->project = Project::create(['name' => 'Acme', 'status' => 'Active', 'start_date' => now()->toDateString(), 'created_by' => $this->admin->id, 'project_coordinator_id' => $this->coordinator->id]);
        ProjectFinance::create(['project_id' => $this->project->id, 'contract_value' => 100000]);
        ProjectPayment::create(['project_id' => $this->project->id, 'kind' => 'advance', 'amount' => 30000, 'status' => 'Approved']);
        ProjectBudgetAllocation::create(['project_id' => $this->project->id, 'team_id' => $this->html->id, 'amount' => 40000]);
        ProjectBudgetAllocation::create(['project_id' => $this->project->id, 'team_id' => $this->design->id, 'amount' => 20000]);
    }

    private function as(User $user): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer ' . $user->createToken('t')->plainTextToken);
    }

    private function sprint(int $cost = 15000, string $title = 'Sprint 1'): int
    {
        return $this->as($this->lead)->postJson("/api/work/projects/{$this->project->id}/sprints", ['team_id' => $this->html->id, 'title' => $title, 'cost_estimate' => $cost])->assertCreated()->json('data.id');
    }

    private function submitted(int $cost = 15000, string $title = 'Sprint 1'): int
    {
        $id = $this->sprint($cost, $title);
        $this->as($this->lead)->postJson("/api/work/sprints/{$id}/items", ['title' => 'Header', 'effort_days' => 2, 'assigned_to' => $this->dev->id])->assertCreated();
        $this->as($this->lead)->postJson("/api/work/sprints/{$id}/items", ['title' => 'Footer', 'effort_days' => 1, 'assigned_to' => $this->dev2->id])->assertCreated();
        $this->as($this->lead)->postJson("/api/work/sprints/{$id}/submit")->assertOk();

        return $id;
    }

    private function scheduled(): int
    {
        $id = $this->submitted();
        $this->as($this->manager)->postJson("/api/work/sprints/{$id}/decision", ['decision' => 'approve'])->assertOk();
        $this->as($this->coordinator)->postJson("/api/work/sprints/{$id}/request-dates", ['start' => now()->toDateString(), 'end' => now()->addDays(5)->toDateString()])->assertOk();
        $this->as($this->lead)->postJson("/api/work/sprints/{$id}/schedule")->assertOk();

        return $id;
    }

    public function test_only_the_department_lead_or_manager_plans_and_only_budgeted_work_departments_qualify(): void
    {
        $url = "/api/work/projects/{$this->project->id}/sprints";
        $this->as($this->dev)->getJson($url)->assertOk();                                                                       // members can see it
        $this->as($this->dev)->postJson($url, ['team_id' => $this->html->id, 'title' => 'x'])->assertStatus(403);
        $this->as($this->lead)->postJson($url, ['team_id' => $this->design->id, 'title' => 'x'])->assertStatus(422);              // design uses pages, not sprints
        $this->as($this->manager)->postJson($url, ['team_id' => Team::create(['name' => 'PHP'])->id, 'title' => 'x'])->assertStatus(422); // no budget
        $this->as($this->manager)->postJson($url, ['team_id' => $this->html->id, 'title' => 'By PM'])->assertCreated();

        $depts = collect($this->as($this->lead)->getJson($url)->json('departments'));
        $this->assertSame([$this->html->id], $depts->pluck('id')->all());
        $this->assertTrue($depts[0]['can_plan']);
        $this->assertFalse(collect($this->as($this->dev)->getJson($url)->json('departments'))[0]['can_plan']);
    }

    public function test_payment_lock_applies_to_sprints(): void
    {
        ProjectPayment::query()->delete();
        $this->as($this->lead)->postJson("/api/work/projects/{$this->project->id}/sprints", ['team_id' => $this->html->id, 'title' => 'x'])->assertStatus(423);
    }

    public function test_items_need_effort_stay_in_the_department_and_freeze_after_submit(): void
    {
        $id = $this->sprint();
        $this->as($this->lead)->postJson("/api/work/sprints/{$id}/submit")->assertStatus(422); // empty
        $this->as($this->lead)->postJson("/api/work/sprints/{$id}/items", ['title' => 'x', 'effort_days' => 0])->assertStatus(422);
        $this->as($this->lead)->postJson("/api/work/sprints/{$id}/items", ['title' => 'x', 'effort_days' => 1, 'assigned_to' => $this->designer->id])->assertStatus(422); // other department

        $item = $this->as($this->lead)->postJson("/api/work/sprints/{$id}/items", ['title' => 'Header', 'effort_days' => 2])->assertCreated()->json('data.id');
        $this->as($this->dev)->postJson("/api/work/sprints/{$id}/items", ['title' => 'x', 'effort_days' => 1])->assertStatus(403);
        $this->as($this->lead)->postJson("/api/work/sprints/{$id}/submit")->assertOk();

        $this->as($this->lead)->postJson("/api/work/sprints/{$id}/items", ['title' => 'late', 'effort_days' => 1])->assertStatus(422);
        $this->as($this->lead)->putJson("/api/work/sprint-items/{$item}", ['effort_days' => 9])->assertStatus(422); // approved effort cannot move
        $this->as($this->lead)->putJson("/api/work/sprint-items/{$item}", ['assigned_to' => $this->dev->id])->assertOk(); // assignment still can
        $this->assertTrue($this->manager->notifications()->get()->pluck('data.event')->contains('sprint_submitted'));
    }

    public function test_manager_decides_reject_needs_reason_and_a_rejected_sprint_can_be_fixed_and_resubmitted(): void
    {
        $id = $this->submitted();
        $this->as($this->lead)->postJson("/api/work/sprints/{$id}/decision", ['decision' => 'approve'])->assertStatus(403);
        $this->as($this->manager)->postJson("/api/work/sprints/{$id}/decision", ['decision' => 'reject'])->assertStatus(422);
        $this->as($this->manager)->postJson("/api/work/sprints/{$id}/decision", ['decision' => 'reject', 'note' => 'Too much for the budget'])->assertOk()->assertJsonPath('data.status', 'Rejected');
        $this->assertTrue($this->lead->notifications()->get()->pluck('data.event')->contains('sprint_decided'));

        $this->as($this->lead)->putJson("/api/work/sprints/{$id}", ['cost_estimate' => 9000])->assertOk();
        $this->as($this->lead)->postJson("/api/work/sprints/{$id}/submit")->assertOk();
        $this->as($this->manager)->postJson("/api/work/sprints/{$id}/decision", ['decision' => 'approve'])->assertOk()->assertJsonPath('data.status', 'Approved');
        $this->as($this->manager)->postJson("/api/work/sprints/{$id}/decision", ['decision' => 'approve'])->assertStatus(422); // already decided
    }

    public function test_approval_is_checked_against_the_department_budget_and_over_budget_needs_confirmation(): void
    {
        ProjectBudgetAllocation::where('team_id', $this->html->id)->update(['amount' => 5]); // person-days
        $a = $this->submitted(0, 'First');   // 3 days each (2 + 1)
        $b = $this->submitted(0, 'Second');  // 3 + 3 > 5
        $this->as($this->manager)->postJson("/api/work/sprints/{$a}/decision", ['decision' => 'approve'])->assertOk();

        $this->as($this->manager)->postJson("/api/work/sprints/{$b}/decision", ['decision' => 'approve'])->assertStatus(422)->assertJsonPath('over_budget', true);
        $this->assertSame('Submitted', WorkSprint::find($b)->status);

        $this->as($this->manager)->postJson("/api/work/sprints/{$b}/decision", ['decision' => 'approve', 'allow_over_budget' => true])->assertOk();
        $this->assertTrue($this->admin->notifications()->get()->pluck('data.event')->contains('sprint_over_budget'));

        $dept = collect($this->as($this->lead)->getJson("/api/work/projects/{$this->project->id}/sprints")->json('departments'))->first();
        $this->assertEquals(6, $dept['approved_cost']); // person-days
    }

    public function test_dates_are_requested_by_the_coordinator_then_confirmed_by_the_team_lead(): void
    {
        $id = $this->submitted();
        $dates = ['start' => now()->toDateString(), 'end' => now()->addDays(5)->toDateString()];

        $this->as($this->coordinator)->postJson("/api/work/sprints/{$id}/request-dates", $dates)->assertStatus(422); // not approved yet
        $this->as($this->manager)->postJson("/api/work/sprints/{$id}/decision", ['decision' => 'approve'])->assertOk();
        $this->as($this->lead)->postJson("/api/work/sprints/{$id}/request-dates", $dates)->assertStatus(403);
        $this->as($this->coordinator)->postJson("/api/work/sprints/{$id}/request-dates", ['start' => '2026-12-10', 'end' => '2026-12-01'])->assertStatus(422);
        $this->as($this->lead)->postJson("/api/work/sprints/{$id}/schedule")->assertStatus(422); // no dates yet

        $this->as($this->coordinator)->postJson("/api/work/sprints/{$id}/request-dates", $dates)->assertOk();
        $this->assertTrue($this->lead->notifications()->get()->pluck('data.event')->contains('sprint_dates_requested'));
        $this->as($this->dev)->postJson("/api/work/sprints/{$id}/schedule")->assertStatus(403);
        $this->as($this->lead)->postJson("/api/work/sprints/{$id}/schedule")->assertOk()->assertJsonPath('data.status', 'Scheduled');

        $this->assertTrue($this->dev->notifications()->get()->pluck('data.event')->contains('sprint_scheduled'));
        $this->assertTrue($this->coordinator->notifications()->get()->pluck('data.event')->contains('sprint_scheduled'));
    }

    public function test_daily_progress_rules_overrun_reason_and_automatic_sprint_states(): void
    {
        $id = $this->submitted();
        $items = WorkSprint::find($id)->items()->get();
        $header = $items[0]->id;  // dev, 2 days
        $footer = $items[1]->id;  // dev2, 1 day

        $this->as($this->dev)->postJson("/api/work/sprint-items/{$header}/status", ['status' => 'In progress'])->assertStatus(422); // not scheduled yet
        $this->as($this->manager)->postJson("/api/work/sprints/{$id}/decision", ['decision' => 'approve'])->assertOk();
        $this->as($this->coordinator)->postJson("/api/work/sprints/{$id}/request-dates", ['start' => now()->toDateString(), 'end' => now()->addDays(5)->toDateString()])->assertOk();
        $this->as($this->lead)->postJson("/api/work/sprints/{$id}/schedule")->assertOk();

        $this->as($this->dev2)->postJson("/api/work/sprint-items/{$header}/status", ['status' => 'In progress'])->assertStatus(403); // not theirs
        $this->as($this->dev)->postJson("/api/work/sprint-items/{$header}/status", ['status' => 'In progress', 'time_spent_days' => 1])->assertOk()->assertJsonPath('sprint_status', 'In progress');

        // 3 days spent on a 2 day task: finishing needs a reason
        $this->as($this->dev)->postJson("/api/work/sprint-items/{$header}/status", ['status' => 'Completed', 'time_spent_days' => 3])->assertStatus(422);
        $this->as($this->dev)->postJson("/api/work/sprint-items/{$header}/status", ['status' => 'Completed', 'time_spent_days' => 3, 'note' => 'Client changed the layout'])->assertOk();
        $events = $this->lead->notifications()->get()->pluck('data.event');
        $this->assertTrue($events->contains('item_completed'));
        $this->assertTrue($events->contains('effort_exceeded'));
        $this->assertTrue($this->manager->notifications()->get()->pluck('data.event')->contains('effort_exceeded'));

        // sprint completes once every task is Approved
        $this->as($this->lead)->postJson("/api/work/sprint-items/{$header}/status", ['status' => 'Approved', 'note' => 'Reviewed'])->assertOk();
        $this->as($this->dev2)->postJson("/api/work/sprint-items/{$footer}/status", ['status' => 'Approved'])->assertOk()->assertJsonPath('sprint_status', 'Completed');
        $this->assertTrue($this->coordinator->notifications()->get()->pluck('data.event')->contains('sprint_completed'));

        $detail = $this->as($this->lead)->getJson("/api/work/sprints/{$id}")->assertOk()->json();
        $this->assertEquals(3, $detail['totals']['effort_days']);
        $this->assertNotEmpty($detail['events']);
    }
}
