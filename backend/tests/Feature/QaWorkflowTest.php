<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectBudgetAllocation;
use App\Models\ProjectFinance;
use App\Models\ProjectPayment;
use App\Models\QaReview;
use App\Models\SprintItem;
use App\Models\Team;
use App\Models\User;
use App\Models\WorkSprint;
use App\Support\Feature;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class QaWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;
    private User $coordinator;
    private User $lead;     // HTML team lead
    private User $dev;      // HTML developer
    private User $dev2;     // another HTML developer
    private User $qaLead;
    private User $tester;
    private User $designer;
    private User $admin;
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
        $qa = Team::create(['name' => 'QA']);
        $design = Team::create(['name' => 'Design']);
        $this->manager = User::factory()->create(['team_id' => $pmo->id]);
        $pmo->update(['team_lead_id' => $this->manager->id]);
        $this->coordinator = User::factory()->create(['team_id' => $pmo->id]);
        $this->lead = User::factory()->create(['team_id' => $this->html->id]);
        $this->html->update(['team_lead_id' => $this->lead->id]);
        $this->dev = User::factory()->create(['team_id' => $this->html->id]);
        $this->dev2 = User::factory()->create(['team_id' => $this->html->id]);
        $this->qaLead = User::factory()->create(['team_id' => $qa->id]);
        $qa->update(['team_lead_id' => $this->qaLead->id]);
        $this->tester = User::factory()->create(['team_id' => $qa->id]);
        $this->designer = User::factory()->create(['team_id' => $design->id]);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('Super Admin');

        $this->project = Project::create(['name' => 'Acme', 'status' => 'Active', 'start_date' => now()->toDateString(), 'created_by' => $this->admin->id, 'project_coordinator_id' => $this->coordinator->id]);
        ProjectFinance::create(['project_id' => $this->project->id, 'contract_value' => 100000]);
        ProjectPayment::create(['project_id' => $this->project->id, 'kind' => 'advance', 'amount' => 30000, 'status' => 'Approved']);
        ProjectBudgetAllocation::create(['project_id' => $this->project->id, 'team_id' => $this->html->id, 'amount' => 40000]);
    }

    private function as(User $user): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer ' . $user->createToken('t')->plainTextToken);
    }

    /** A scheduled sprint with one task (2 days) assigned to $dev; returns [sprintId, itemId]. */
    private function scheduledSprint(): array
    {
        $sid = $this->as($this->lead)->postJson("/api/work/projects/{$this->project->id}/sprints", ['team_id' => $this->html->id, 'title' => 'S1', 'cost_estimate' => 10000])->assertCreated()->json('data.id');
        $item = $this->as($this->lead)->postJson("/api/work/sprints/{$sid}/items", ['title' => 'Header', 'effort_days' => 2, 'assigned_to' => $this->dev->id])->assertCreated()->json('data.id');
        $this->as($this->lead)->postJson("/api/work/sprints/{$sid}/submit")->assertOk();
        $this->as($this->manager)->postJson("/api/work/sprints/{$sid}/decision", ['decision' => 'approve'])->assertOk();
        $this->as($this->lead)->postJson("/api/work/sprints/{$sid}/schedule", ['start' => now()->toDateString(), 'end' => now()->addDays(5)->toDateString()])->assertOk();

        return [$sid, $item];
    }

    private function finish(int $item, float $spent = 1): int
    {
        $this->as($this->dev)->postJson("/api/work/sprint-items/{$item}/status", ['status' => 'Completed', 'time_spent_days' => $spent])->assertOk();

        return QaReview::where('sprint_item_id', $item)->latest('id')->value('id');
    }

    public function test_finishing_a_task_opens_a_qa_review_and_tells_the_qa_team(): void
    {
        [, $item] = $this->scheduledSprint();
        $review = $this->finish($item);

        $this->assertSame(1, QaReview::where('sprint_item_id', $item)->count());
        $this->assertSame('Open', QaReview::find($review)->status);
        $this->assertSame(1, QaReview::find($review)->round);
        $this->assertTrue($this->tester->notifications()->get()->pluck('data.event')->contains('qa_ready'));
        $this->assertTrue($this->qaLead->notifications()->get()->pluck('data.event')->contains('qa_ready'));
        $this->assertFalse($this->designer->notifications()->get()->pluck('data.event')->contains('qa_ready'));
    }

    public function test_queue_is_for_qa_and_managers_and_the_project_list_for_the_project_team(): void
    {
        [, $item] = $this->scheduledSprint();
        $this->finish($item);

        $this->as($this->tester)->getJson('/api/work/qa/queue')->assertOk()->assertJsonCount(1, 'data');
        $this->as($this->manager)->getJson('/api/work/qa/queue')->assertOk();
        $this->as($this->dev)->getJson('/api/work/qa/queue')->assertStatus(403);
        $this->as($this->designer)->getJson('/api/work/qa/queue')->assertStatus(403);

        $rows = $this->as($this->dev)->getJson("/api/work/projects/{$this->project->id}/qa")->assertOk()->json('data');
        $this->assertSame('Header', $rows[0]['task']);
    }

    public function test_only_qa_takes_a_review_and_only_the_assigned_tester_lists_bugs_and_finishes_it(): void
    {
        [, $item] = $this->scheduledSprint();
        $review = $this->finish($item);

        $this->as($this->dev)->postJson("/api/work/qa/reviews/{$review}/take")->assertStatus(403);
        $this->as($this->tester)->postJson("/api/work/qa/reviews/{$review}/bugs", ['title' => 'x', 'priority' => 'High'])->assertStatus(403); // not taken yet
        $this->as($this->tester)->postJson("/api/work/qa/reviews/{$review}/take")->assertOk()->assertJsonPath('data.status', 'In review');
        $this->as($this->qaLead)->postJson("/api/work/qa/reviews/{$review}/take")->assertStatus(422); // already taken

        $this->as($this->dev)->postJson("/api/work/qa/reviews/{$review}/bugs", ['title' => 'x', 'priority' => 'High'])->assertStatus(403);
        $this->as($this->tester)->postJson("/api/work/qa/reviews/{$review}/bugs", ['title' => 'Menu overlaps', 'priority' => 'Urgent'])->assertStatus(422);
        $this->as($this->tester)->postJson("/api/work/qa/reviews/{$review}/bugs", ['title' => 'Menu overlaps', 'priority' => 'High', 'description' => 'On mobile'])->assertCreated();
        $this->as($this->dev)->postJson("/api/work/qa/reviews/{$review}/complete", ['result' => 'fail'])->assertStatus(403);
    }

    public function test_failing_sends_the_task_back_then_a_second_round_can_pass_and_the_lead_verifies(): void
    {
        [$sid, $item] = $this->scheduledSprint();
        $review = $this->finish($item);
        $this->as($this->tester)->postJson("/api/work/qa/reviews/{$review}/take")->assertOk();

        $this->as($this->tester)->postJson("/api/work/qa/reviews/{$review}/complete", ['result' => 'fail'])->assertStatus(422); // no bug listed
        $bug = $this->as($this->tester)->postJson("/api/work/qa/reviews/{$review}/bugs", ['title' => 'Menu overlaps', 'priority' => 'High'])->json('data.id');
        $this->as($this->tester)->postJson("/api/work/qa/reviews/{$review}/complete", ['result' => 'pass'])->assertStatus(422); // open bug
        $this->as($this->tester)->postJson("/api/work/qa/reviews/{$review}/complete", ['result' => 'fail', 'note' => 'Fix the header'])->assertOk()->assertJsonPath('task_status', 'Testing bugs 1');

        $this->assertSame('Failed', QaReview::find($review)->status);
        $this->assertSame('Testing bugs 1', SprintItem::find($item)->status);
        $this->assertTrue($this->dev->notifications()->get()->pluck('data.event')->contains('qa_failed'));
        $this->assertTrue($this->lead->notifications()->get()->pluck('data.event')->contains('qa_failed'));

        // the developer (not another developer) marks the bug fixed; only QA verifies it
        $this->as($this->dev2)->putJson("/api/work/qa/bugs/{$bug}", ['status' => 'Fixed'])->assertStatus(403);
        $this->as($this->dev)->putJson("/api/work/qa/bugs/{$bug}", ['status' => 'Fixed'])->assertOk();
        $this->as($this->dev)->putJson("/api/work/qa/bugs/{$bug}", ['status' => 'Verified'])->assertStatus(403);

        // developer finishes again: a second review (round 2) opens
        $second = $this->finish($item);
        $this->assertNotSame($review, $second);
        $this->assertSame(2, QaReview::find($second)->round);
        $this->as($this->tester)->postJson("/api/work/qa/reviews/{$second}/take")->assertOk();
        $this->as($this->tester)->postJson("/api/work/qa/reviews/{$second}/complete", ['result' => 'pass'])->assertOk()->assertJsonPath('task_status', 'Waiting for approval');
        $this->assertTrue($this->lead->notifications()->get()->pluck('data.event')->contains('qa_passed'));

        // team lead verifies; the sprint completes
        $this->as($this->lead)->postJson("/api/work/sprint-items/{$item}/status", ['status' => 'Approved', 'note' => 'Verified'])->assertOk()->assertJsonPath('sprint_status', 'Completed');
        $this->assertSame('Completed', WorkSprint::find($sid)->status);
    }

    public function test_a_task_that_keeps_failing_alerts_the_project_manager_on_the_fourth_round(): void
    {
        [, $item] = $this->scheduledSprint();
        for ($round = 1; $round <= 3; $round++) {
            $review = $this->finish($item);
            $this->as($this->tester)->postJson("/api/work/qa/reviews/{$review}/take")->assertOk();
            $this->as($this->tester)->postJson("/api/work/qa/reviews/{$review}/bugs", ['title' => "Bug {$round}", 'priority' => 'Low'])->assertCreated();
            $this->as($this->tester)->postJson("/api/work/qa/reviews/{$review}/complete", ['result' => 'fail'])->assertOk();
        }
        $this->assertSame('Testing bugs 3', SprintItem::find($item)->status);
        $this->assertFalse($this->manager->notifications()->get()->pluck('data.event')->contains('qa_repeated'));

        $this->finish($item); // 4th round
        $this->assertTrue($this->manager->notifications()->get()->pluck('data.event')->contains('qa_repeated'));
    }

    public function test_a_sprint_that_took_more_effort_than_planned_alerts_managers_and_the_super_admin(): void
    {
        [$sid, $item] = $this->scheduledSprint();

        // planned 2 days, spent 3: finishing needs a reason
        $this->as($this->dev)->postJson("/api/work/sprint-items/{$item}/status", ['status' => 'Completed', 'time_spent_days' => 3])->assertStatus(422);
        $this->as($this->dev)->postJson("/api/work/sprint-items/{$item}/status", ['status' => 'Completed', 'time_spent_days' => 3, 'note' => 'Client changed the layout'])->assertOk();

        $review = QaReview::where('sprint_item_id', $item)->value('id');
        $this->as($this->tester)->postJson("/api/work/qa/reviews/{$review}/take")->assertOk();
        $this->as($this->tester)->postJson("/api/work/qa/reviews/{$review}/complete", ['result' => 'pass'])->assertOk();
        $this->assertFalse($this->admin->notifications()->get()->pluck('data.event')->contains('sprint_over_effort')); // not yet: sprint still open

        $this->as($this->lead)->postJson("/api/work/sprint-items/{$item}/status", ['status' => 'Approved', 'note' => 'Verified'])->assertOk();
        $this->assertSame('Completed', WorkSprint::find($sid)->status);
        $this->assertTrue($this->admin->notifications()->get()->pluck('data.event')->contains('sprint_over_effort'));
        $this->assertTrue($this->manager->notifications()->get()->pluck('data.event')->contains('sprint_over_effort'));
    }
}
