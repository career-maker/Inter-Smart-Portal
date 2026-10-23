<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectBudgetAllocation;
use App\Models\ProjectFinance;
use App\Models\ProjectIntake;
use App\Models\ProjectPayment;
use App\Models\Team;
use App\Models\User;
use App\Support\Feature;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class UiWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;
    private User $coordinator;
    private User $uiLead;
    private User $designer;
    private User $developer;   // HTML team, no budget on the project
    private User $admin;
    private Project $project;

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'Super Admin']);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        Feature::set('workflow', true);

        $pmo = Team::create(['name' => 'PMO 1']);
        $design = Team::create(['name' => 'Design']);
        $html = Team::create(['name' => 'HTML']);
        $this->manager = User::factory()->create(['team_id' => $pmo->id]);
        $pmo->update(['team_lead_id' => $this->manager->id]);
        $this->coordinator = User::factory()->create(['team_id' => $pmo->id]);
        $this->uiLead = User::factory()->create(['team_id' => $design->id]);
        $design->update(['team_lead_id' => $this->uiLead->id]);
        $this->designer = User::factory()->create(['team_id' => $design->id, 'first_name' => 'Dina', 'last_name' => 'Designer']);
        $this->developer = User::factory()->create(['team_id' => $html->id]);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('Super Admin');

        $this->project = Project::create(['name' => 'Acme', 'status' => 'Active', 'start_date' => now()->toDateString(), 'created_by' => $this->admin->id, 'project_coordinator_id' => $this->coordinator->id]);
        ProjectFinance::create(['project_id' => $this->project->id, 'contract_value' => 100000]);
        ProjectIntake::create(['project_id' => $this->project->id, 'client_name' => 'Acme', 'site_category' => 'CMS', 'platform' => 'WordPress', 'pages_count' => 2, 'budget' => 100000, 'sales_user_id' => $this->admin->id]);
        ProjectPayment::create(['project_id' => $this->project->id, 'kind' => 'advance', 'amount' => 30000, 'status' => 'Approved']);
        ProjectBudgetAllocation::create(['project_id' => $this->project->id, 'team_id' => $design->id, 'amount' => 50000]);
    }

    private function as(User $user): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer ' . $user->createToken('t')->plainTextToken);
    }

    private function page(string $title = 'Home', array $extra = []): int
    {
        return $this->as($this->coordinator)->postJson("/api/work/projects/{$this->project->id}/ui/pages", ['title' => $title] + $extra)->assertCreated()->json('data.id');
    }

    public function test_hidden_until_switched_on_and_per_project_access(): void
    {
        Feature::set('workflow', false);
        $this->as($this->designer)->getJson('/api/work/projects')->assertStatus(404);

        Feature::set('workflow', true);
        $this->as($this->designer)->getJson("/api/work/projects/{$this->project->id}/ui")->assertOk();
        $this->as($this->uiLead)->getJson("/api/work/projects/{$this->project->id}/ui")->assertOk();
        $this->as($this->coordinator)->getJson("/api/work/projects/{$this->project->id}/ui")->assertOk();
        $this->as($this->manager)->getJson("/api/work/projects/{$this->project->id}/ui")->assertOk();
        $this->as($this->developer)->getJson("/api/work/projects/{$this->project->id}/ui")->assertStatus(403); // HTML has no budget here

        $this->as($this->designer)->getJson('/api/features')->assertJson(['workflow' => true]);
        $this->as($this->developer)->getJson('/api/features')->assertJson(['workflow' => false]);
        $this->assertCount(1, $this->as($this->designer)->getJson('/api/work/projects')->json('data'));
        $this->assertCount(0, $this->as($this->developer)->getJson('/api/work/projects')->json('data'));
    }

    public function test_payment_and_budget_locks_apply_to_the_work_screens(): void
    {
        ProjectPayment::query()->delete();
        $this->as($this->coordinator)->postJson("/api/work/projects/{$this->project->id}/ui/pages", ['title' => 'Home'])->assertStatus(423);

        ProjectPayment::create(['project_id' => $this->project->id, 'kind' => 'advance', 'amount' => 30000, 'status' => 'Approved']);
        ProjectBudgetAllocation::query()->delete();
        $this->as($this->coordinator)->postJson("/api/work/projects/{$this->project->id}/ui/pages", ['title' => 'Home'])->assertStatus(423);
    }

    public function test_only_ui_lead_coordinator_or_manager_create_pages_and_extra_pages_wait_for_approval(): void
    {
        $this->as($this->designer)->postJson("/api/work/projects/{$this->project->id}/ui/pages", ['title' => 'x'])->assertStatus(403);

        $this->page('Home');
        $this->page('About');
        $third = $this->as($this->uiLead)->postJson("/api/work/projects/{$this->project->id}/ui/pages", ['title' => 'Blog'])->assertCreated();
        $this->assertTrue($third->json('needs_approval')); // the sale had 2 pages
        $this->assertSame('Pending', $third->json('data.approval'));
        $this->assertTrue($this->manager->notifications()->get()->pluck('data.event')->contains('page_requested'));

        $id = $third->json('data.id');
        $this->as($this->uiLead)->postJson("/api/work/ui/pages/{$id}/decision", ['decision' => 'approve'])->assertStatus(403);
        $this->as($this->designer)->postJson("/api/work/ui/pages/{$id}/status", ['status' => 'Ongoing'])->assertStatus(422); // not approved yet
        $this->as($this->manager)->postJson("/api/work/ui/pages/{$id}/decision", ['decision' => 'reject'])->assertStatus(422); // reason needed
        $this->as($this->manager)->postJson("/api/work/ui/pages/{$id}/decision", ['decision' => 'approve'])->assertOk()->assertJsonPath('data.approval', 'Approved');
        $this->as($this->manager)->postJson("/api/work/ui/pages/{$id}/decision", ['decision' => 'approve'])->assertStatus(422); // already decided
    }

    public function test_status_chain_is_logged_notifies_and_validates(): void
    {
        $id = $this->page('Home');

        $this->as($this->developer)->postJson("/api/work/ui/pages/{$id}/status", ['status' => 'Ongoing'])->assertStatus(403);
        $this->as($this->designer)->postJson("/api/work/ui/pages/{$id}/status", ['status' => 'Nonsense'])->assertStatus(422);
        $this->as($this->designer)->postJson("/api/work/ui/pages/{$id}/status", ['status' => 'Pending'])->assertStatus(422); // already there
        $this->as($this->designer)->postJson("/api/work/ui/pages/{$id}/status", ['status' => 'Ongoing'])->assertOk();
        $this->as($this->designer)->postJson("/api/work/ui/pages/{$id}/status", ['status' => 'Completed'])->assertOk();

        $this->assertTrue($this->uiLead->notifications()->get()->pluck('data.event')->contains('page_completed'));
        $this->assertTrue($this->coordinator->notifications()->get()->pluck('data.event')->contains('page_completed'));

        $this->as($this->coordinator)->postJson("/api/work/ui/pages/{$id}/status", ['status' => 'Rejected'])->assertStatus(422); // reason needed
        $this->as($this->coordinator)->postJson("/api/work/ui/pages/{$id}/status", ['status' => 'Correction 1', 'update_type' => 'correction', 'note' => 'Logo too small'])->assertOk();
        $this->as($this->coordinator)->postJson("/api/work/ui/pages/{$id}/status", ['status' => 'Correction 2', 'update_type' => 'oops'])->assertStatus(422);

        $events = $this->as($this->designer)->getJson("/api/work/ui/pages/{$id}")->assertOk()->json('events');
        $this->assertSame(['Correction 1', 'Completed', 'Ongoing'], collect($events)->pluck('to_status')->all()); // newest first
        $this->assertSame('Logo too small', $events[0]['note']);
    }

    public function test_sections_respect_the_allocated_count_and_support_sub_sections(): void
    {
        $id = $this->page('Home', ['est_sections' => 2]);

        $this->as($this->developer)->postJson("/api/work/ui/pages/{$id}/sections", ['title' => 'Hero'])->assertStatus(403);
        $hero = $this->as($this->designer)->postJson("/api/work/ui/pages/{$id}/sections", ['title' => 'Hero', 'subtitle' => 'Welcome', 'statistics' => '15 years', 'content' => 'Text', 'description' => 'Full width banner'])->assertCreated()->json('data.id');
        $this->as($this->designer)->postJson("/api/work/ui/pages/{$id}/sections", ['title' => 'Services'])->assertCreated();
        $this->as($this->designer)->postJson("/api/work/ui/pages/{$id}/sections", ['title' => 'Too many'])->assertStatus(422); // allocated 2

        // sub-sections are not counted against the allocation, and must sit under a section of this page
        $this->as($this->designer)->postJson("/api/work/ui/pages/{$id}/sections", ['title' => 'CTA button', 'parent_id' => $hero])->assertCreated();
        $this->as($this->designer)->postJson("/api/work/ui/pages/{$id}/sections", ['title' => 'Orphan', 'parent_id' => 99999])->assertStatus(422);

        $tree = $this->as($this->designer)->getJson("/api/work/ui/pages/{$id}")->json('sections');
        $this->assertCount(2, $tree);
        $this->assertSame('CTA button', $tree[0]['children'][0]['title']);

        $this->as($this->designer)->putJson("/api/work/ui/sections/{$hero}", ['title' => 'Hero banner'])->assertOk()->assertJsonPath('data.title', 'Hero banner');
        $this->as($this->designer)->deleteJson("/api/work/ui/sections/{$hero}")->assertOk();
        $this->assertCount(1, $this->as($this->designer)->getJson("/api/work/ui/pages/{$id}")->json('sections'));

        // the UI lead can raise the allocation
        $this->as($this->uiLead)->putJson("/api/work/ui/pages/{$id}", ['est_sections' => 5])->assertOk();
        $this->as($this->designer)->putJson("/api/work/ui/pages/{$id}", ['est_sections' => 9])->assertStatus(403);
    }

    public function test_page_budgets_stay_inside_the_design_budget_and_assignment_is_design_only(): void
    {
        $a = $this->page('Home');
        $b = $this->page('About');

        $this->as($this->uiLead)->putJson("/api/work/ui/pages/{$a}", ['budget' => 30000])->assertOk();
        $this->as($this->uiLead)->putJson("/api/work/ui/pages/{$b}", ['budget' => 25000])->assertStatus(422); // 55,000 > 50,000
        $this->as($this->uiLead)->putJson("/api/work/ui/pages/{$b}", ['budget' => 20000])->assertOk();

        $res = $this->as($this->uiLead)->getJson("/api/work/projects/{$this->project->id}/ui")->json();
        $this->assertEquals(50000, $res['budget']['cap']);
        $this->assertEquals(50000, $res['budget']['used']);
        $this->assertEquals(0, $res['budget']['left']);

        $this->as($this->uiLead)->putJson("/api/work/ui/pages/{$a}", ['assigned_to' => $this->developer->id])->assertStatus(422);
        $this->as($this->uiLead)->putJson("/api/work/ui/pages/{$a}", ['assigned_to' => $this->designer->id])->assertOk();
        $this->assertTrue($this->designer->notifications()->get()->pluck('data.event')->contains('page_assigned'));
        $row = collect($this->as($this->designer)->getJson("/api/work/projects/{$this->project->id}/ui")->json('pages'))->firstWhere('id', $a);
        $this->assertSame('Dina Designer', $row['assignee']);
    }
}
