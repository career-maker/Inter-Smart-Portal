<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Team;
use App\Models\User;
use App\Support\Feature;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class PmoModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;      // lead of PMO 1 (project manager)
    private User $coordinator;  // PMO 1 member (project coordinator)
    private User $otherPc;      // PMO 2 member
    private User $sales;
    private User $accounts;
    private User $admin;
    private User $stranger;
    private Team $design;
    private Team $html;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (['Super Admin', 'Employee'] as $r) {
            Role::firstOrCreate(['name' => $r]);
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $pmo1 = Team::create(['name' => 'PMO 1']);
        $pmo2 = Team::create(['name' => 'PMO 2']);
        $this->manager = User::factory()->create(['team_id' => $pmo1->id]);
        $pmo1->update(['team_lead_id' => $this->manager->id]);
        $this->coordinator = User::factory()->create(['team_id' => $pmo1->id]);
        $this->otherPc = User::factory()->create(['team_id' => $pmo2->id]);
        $this->sales = User::factory()->create(['team_id' => Team::create(['name' => 'Sales'])->id]);
        $this->accounts = User::factory()->create(['team_id' => Team::create(['name' => 'Accounts'])->id]);
        $this->design = Team::create(['name' => 'Design']);
        $this->html = Team::create(['name' => 'HTML']);
        $this->stranger = User::factory()->create(['team_id' => $this->html->id]);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('Super Admin');

        foreach (['sales', 'accounts', 'pmo'] as $f) {
            Feature::set($f, true);
        }
    }

    private function as(User $user): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer ' . $user->createToken('t')->plainTextToken);
    }

    /** A project created by Sales with a 100000 contract, so the whole chain is real. */
    private function salesProject(string $name = 'Acme Website'): int
    {
        return $this->as($this->sales)->postJson('/api/sales/projects', [
            'name' => $name, 'client_name' => 'Acme', 'site_category' => 'CMS', 'platform' => 'WordPress', 'pages_count' => 10, 'budget' => 100000, 'currency' => 'AED', 'budget_cap' => 100,
        ])->assertCreated()->json('data.id');
    }

    private function approveAdvance(int $projectId, float $amount = 30000): void
    {
        $p = $this->as($this->accounts)->postJson("/api/accounts/projects/{$projectId}/payments", ['kind' => 'advance', 'amount' => $amount])->json('data.id');
        $this->as($this->accounts)->postJson("/api/accounts/payments/{$p}/approve")->assertOk();
    }

    private function assign(int $projectId): void
    {
        $this->as($this->manager)->postJson("/api/pmo/projects/{$projectId}/assign", ['coordinator_id' => $this->coordinator->id])->assertOk();
    }

    public function test_hidden_until_flag_on_and_only_for_pmo_teams_and_admin(): void
    {
        Feature::set('pmo', false);
        $this->as($this->manager)->getJson('/api/pmo/projects')->assertStatus(404);

        Feature::set('pmo', true);
        foreach ([$this->manager, $this->coordinator, $this->admin] as $u) {
            $this->as($u)->getJson('/api/pmo/projects')->assertOk();
        }
        foreach ([$this->stranger, $this->sales, $this->accounts] as $u) {
            $this->as($u)->getJson('/api/pmo/projects')->assertStatus(403);
        }
        $this->as($this->coordinator)->getJson('/api/features')->assertJson(['pmo' => true]);
        $this->as($this->stranger)->getJson('/api/features')->assertJson(['pmo' => false]);
    }

    public function test_meta_lists_delivery_departments_and_pmo_coordinators_only(): void
    {
        $meta = $this->as($this->manager)->getJson('/api/pmo/meta')->assertOk()->json();
        $names = collect($meta['departments'])->pluck('name')->all();
        $this->assertContains('Design', $names);
        $this->assertNotContains('PMO 1', $names);
        $this->assertNotContains('Sales', $names);
        $this->assertTrue($meta['is_manager']);
        $this->assertEqualsCanonicalizing([$this->manager->id, $this->coordinator->id, $this->otherPc->id], collect($meta['coordinators'])->pluck('id')->all());
        $this->assertFalse($this->as($this->coordinator)->getJson('/api/pmo/meta')->json('is_manager'));
    }

    public function test_assign_needs_a_pmo_member_then_the_coordinator_accepts_and_sales_is_told(): void
    {
        $id = $this->salesProject();

        $this->as($this->coordinator)->postJson("/api/pmo/projects/{$id}/assign", ['coordinator_id' => $this->coordinator->id])->assertStatus(403); // not a manager
        $this->as($this->manager)->postJson("/api/pmo/projects/{$id}/assign", ['coordinator_id' => $this->stranger->id])->assertStatus(422);       // not in a PMO team
        $this->assign($id);

        $this->assertSame($this->coordinator->id, Project::find($id)->project_coordinator_id);
        $this->assertSame('project_assigned', $this->coordinator->notifications()->first()->data['event']);

        $this->as($this->otherPc)->postJson("/api/pmo/projects/{$id}/accept")->assertStatus(403);
        $this->as($this->coordinator)->postJson("/api/pmo/projects/{$id}/accept")->assertOk();
        $this->as($this->coordinator)->postJson("/api/pmo/projects/{$id}/accept")->assertStatus(422);

        $this->assertSame('Active', Project::find($id)->status);
        $this->assertTrue($this->sales->notifications()->get()->pluck('data.event')->contains('project_accepted'));
    }

    public function test_list_is_scoped_coordinators_see_only_their_projects(): void
    {
        $a = $this->salesProject('Alpha');
        $b = $this->salesProject('Beta');
        $this->approveAdvance($a);
        $this->approveAdvance($b); // a project reaches the Project Office only once paid / PO / override
        $this->assign($a);

        $this->assertCount(2, $this->as($this->manager)->getJson('/api/pmo/projects')->json('data'));
        $mine = $this->as($this->coordinator)->getJson('/api/pmo/projects')->json('data');
        $this->assertCount(1, $mine);
        $this->assertSame('Alpha', $mine[0]['name']);
        $this->assertCount(0, $this->as($this->otherPc)->getJson('/api/pmo/projects')->json('data'));
        $this->as($this->otherPc)->getJson("/api/pmo/projects/{$a}")->assertStatus(403);
    }

    public function test_payment_never_locks_the_project_office_tabs(): void
    {
        $id = $this->salesProject();
        $this->assign($id);
        $ba = ['purpose' => 'Sell more', 'usp' => 'Fast'];

        // No block for the coordinator even before any payment is recorded.
        $tabs = collect($this->as($this->coordinator)->getJson("/api/pmo/projects/{$id}")->json('gate.tabs'))->keyBy('key');
        $this->assertTrue($tabs['business_analysis']['enabled']);
        $this->as($this->coordinator)->putJson("/api/pmo/projects/{$id}/business-analysis", $ba)->assertOk()->assertJsonPath('data.purpose', 'Sell more');

        $this->as($this->coordinator)->postJson("/api/pmo/projects/{$id}/resources", ['kind' => 'Logo', 'title' => 'Logo pack', 'url' => 'https://example.com/logo.zip'])->assertCreated();
        $this->as($this->coordinator)->postJson("/api/pmo/projects/{$id}/resources", ['kind' => 'Spaceship', 'title' => 'x'])->assertStatus(422);

        // Any approved payment (here an instalment) moves the state off "Advance awaiting".
        $pid = $this->as($this->accounts)->postJson("/api/accounts/projects/{$id}/payments", ['kind' => 'installment', 'amount' => 5000])->json('data.id');
        $this->as($this->accounts)->postJson("/api/accounts/payments/{$pid}/approve")->assertOk();
        $this->assertSame('Pending payment', collect($this->as($this->manager)->getJson('/api/pmo/projects')->json('data'))->firstWhere('id', $id)['state']);
    }

    public function test_department_budget_total_cannot_exceed_contract_without_confirmation_and_unlocks_working_tabs(): void
    {
        $id = $this->salesProject();
        $this->assign($id);
        $this->approveAdvance($id);

        $tabs = fn () => collect($this->as($this->manager)->getJson("/api/pmo/projects/{$id}")->json('gate.tabs'))->keyBy('key');
        $this->assertFalse($tabs()['ui']['enabled']); // paid, but no department budget yet

        $this->as($this->coordinator)->putJson("/api/pmo/projects/{$id}/budget", ['allocations' => []])->assertStatus(403);

        $over = ['allocations' => [['team_id' => $this->design->id, 'amount' => 70], ['team_id' => $this->html->id, 'amount' => 50]]]; // cap is 100 person-days
        $this->as($this->manager)->putJson("/api/pmo/projects/{$id}/budget", $over)->assertStatus(422)->assertJsonPath('over_contract', true);

        $ok = ['allocations' => [['team_id' => $this->design->id, 'amount' => 60], ['team_id' => $this->html->id, 'amount' => 40]]];
        $this->as($this->manager)->putJson("/api/pmo/projects/{$id}/budget", $ok)->assertOk();
        $this->assertTrue($tabs()['ui']['enabled']);
        $this->assertDatabaseHas('project_budget_allocations', ['project_id' => $id, 'team_id' => $this->design->id, 'amount' => 60]);

        // Confirmed over-allocation goes through and tells the Super Admin.
        $this->as($this->manager)->putJson("/api/pmo/projects/{$id}/budget", $over + ['reason' => 'Client added scope'])->assertOk();
        $this->assertTrue($this->admin->notifications()->get()->pluck('data.event')->contains('budget_over_contract'));

        // Zero removes a department.
        $this->as($this->manager)->putJson("/api/pmo/projects/{$id}/budget", ['allocations' => [['team_id' => $this->design->id, 'amount' => 0], ['team_id' => $this->html->id, 'amount' => 10]]])->assertOk();
        $this->assertDatabaseMissing('project_budget_allocations', ['project_id' => $id, 'team_id' => $this->design->id]);
    }

    public function test_budget_override_opens_working_tabs_without_a_budget(): void
    {
        $id = $this->salesProject();
        $this->approveAdvance($id);
        $this->as($this->manager)->postJson("/api/pmo/projects/{$id}/overrides", ['type' => 'budget', 'reason' => 'Budget follows next week'])->assertOk();

        $tabs = collect($this->as($this->manager)->getJson("/api/pmo/projects/{$id}")->json('gate.tabs'))->keyBy('key');
        $this->assertTrue($tabs['dev']['enabled']);
    }

    public function test_hold_with_reason_code_shows_in_list_and_resume_clears_it(): void
    {
        $id = $this->salesProject();
        $this->assign($id);

        $this->as($this->coordinator)->postJson("/api/pmo/projects/{$id}/hold", ['reason_code' => 'content'])->assertStatus(403);
        $this->as($this->manager)->postJson("/api/pmo/projects/{$id}/hold", ['reason_code' => 'nonsense'])->assertStatus(422);
        $this->as($this->manager)->postJson("/api/pmo/projects/{$id}/hold", ['reason_code' => 'other'])->assertStatus(422); // needs a note
        $this->as($this->manager)->postJson("/api/pmo/projects/{$id}/hold", ['reason_code' => 'smtp', 'note' => 'Waiting for SMTP login'])->assertOk();

        $this->assertSame('On Hold', Project::find($id)->status);
        $this->assertCount(0, $this->as($this->manager)->getJson('/api/pmo/projects')->json('data')); // unpaid: not in the Project Office yet
        $row = collect($this->as($this->manager)->getJson('/api/pmo/projects?payment_state=Advance%20awaiting')->json('data'))->firstWhere('id', $id);
        $this->assertSame('SMTP details', $row['hold_reason']);
        $this->assertTrue($this->sales->notifications()->get()->pluck('data.event')->contains('project_on_hold'));

        $this->as($this->manager)->postJson("/api/pmo/projects/{$id}/resume")->assertOk();
        $row = collect($this->as($this->manager)->getJson('/api/pmo/projects')->json('data'))->firstWhere('id', $id);
        $this->assertNull($row['hold_reason']);
        $this->assertSame('Active', Project::find($id)->status);
    }

    public function test_out_of_scope_request_is_approved_by_the_manager_and_sales_is_told(): void
    {
        $id = $this->salesProject();
        $this->assign($id);

        $this->as($this->otherPc)->postJson("/api/pmo/projects/{$id}/out-of-scope", ['description' => 'x', 'effort_days' => 2])->assertStatus(403);
        $this->as($this->coordinator)->postJson("/api/pmo/projects/{$id}/out-of-scope", ['description' => 'Add blog module', 'effort_days' => 0])->assertStatus(422);
        $oos = $this->as($this->coordinator)->postJson("/api/pmo/projects/{$id}/out-of-scope", ['description' => 'Add blog module', 'effort_days' => 3.5, 'amount_estimate' => 12000])->assertCreated()->json('data.id');

        $this->assertTrue($this->manager->notifications()->get()->pluck('data.event')->contains('out_of_scope_requested'));
        $this->assertCount(1, $this->as($this->coordinator)->getJson('/api/pmo/out-of-scope')->json('data'));
        $this->assertCount(0, $this->as($this->otherPc)->getJson('/api/pmo/out-of-scope')->json('data'));

        $this->as($this->coordinator)->postJson("/api/pmo/out-of-scope/{$oos}/decide", ['decision' => 'approve'])->assertStatus(403);
        $this->as($this->manager)->postJson("/api/pmo/out-of-scope/{$oos}/decide", ['decision' => 'reject'])->assertStatus(422); // needs a reason
        $this->as($this->manager)->postJson("/api/pmo/out-of-scope/{$oos}/decide", ['decision' => 'approve'])->assertOk()->assertJsonPath('data.status', 'Approved');
        $this->as($this->manager)->postJson("/api/pmo/out-of-scope/{$oos}/decide", ['decision' => 'approve'])->assertStatus(422); // already decided

        $salesEvents = $this->sales->notifications()->get()->pluck('data.event');
        $this->assertTrue($salesEvents->contains('out_of_scope_approved'));
        $this->assertTrue($this->coordinator->notifications()->get()->pluck('data.event')->contains('out_of_scope_approved'));
    }

    public function test_dashboard_style_list_flags_payment_state_and_date_exceeded(): void
    {
        $id = $this->salesProject();
        Project::where('id', $id)->update(['expected_end_date' => now()->subDays(3)->toDateString(), 'status' => 'Active']);

        $row = collect($this->as($this->manager)->getJson('/api/pmo/projects')->json('data'))->firstWhere('id', $id);
        $this->assertTrue($row['date_exceeded']);
        $this->assertSame('Advance awaiting', $row['state']);
        $this->assertNotNull($row['sales_person']);
        $this->assertNull($row['unallocated']);      // project cost is hidden from the Project Office
        $this->assertNull($row['contract_value']);
        $this->assertCount(1, $this->as($this->manager)->getJson('/api/pmo/projects?payment_state=Advance%20awaiting')->json('data'));
        $this->assertCount(0, $this->as($this->manager)->getJson('/api/pmo/projects?payment_state=Paid%20in%20full')->json('data'));
    }
    public function test_po_or_override_opens_a_project_and_project_cost_is_hidden_from_the_project_office(): void
    {
        $po = $this->salesProject('PO job');
        $ov = $this->salesProject('Override job');
        $none = $this->salesProject('Unpaid job');
        foreach ([[$po, 'po'], [$ov, 'override']] as [$id, $kind]) {
            $pid = $this->as($this->accounts)->postJson("/api/accounts/projects/{$id}/payments", ['kind' => $kind])->assertCreated()->json('data.id'); // no amount needed
            $this->as($this->accounts)->postJson("/api/accounts/payments/{$pid}/approve")->assertOk();
        }
        $this->as($this->accounts)->postJson("/api/accounts/projects/{$none}/payments", ['kind' => 'installment'])->assertStatus(422); // an instalment still needs an amount

        $names = collect($this->as($this->manager)->getJson('/api/pmo/projects')->json('data'))->pluck('name')->all();
        $this->assertEqualsCanonicalizing(['PO job', 'Override job'], $names);

        $show = $this->as($this->manager)->getJson("/api/pmo/projects/{$po}")->assertOk();
        $this->assertFalse($show->json('can_see_cost'));
        $this->assertNull($show->json('intake.budget'));
        $this->assertNull($show->json('gate.payment.contract_value'));
        $this->assertEquals(100000, $this->as($this->admin)->getJson("/api/pmo/projects/{$po}")->json('gate.payment.contract_value'));
    }

    public function test_milestone_tells_accounts_and_the_amount_is_a_share_of_the_project_cost(): void
    {
        $id = $this->salesProject();
        $this->assign($id);
        $this->approveAdvance($id);

        $this->as($this->coordinator)->postJson("/api/pmo/projects/{$id}/payment-request", ['milestone' => 'Design approved', 'percent' => 25])->assertCreated();
        $this->assertDatabaseHas('project_payments', ['project_id' => $id, 'kind' => 'milestone', 'amount' => 25000, 'status' => 'Awaiting']);
        $this->assertTrue($this->accounts->notifications()->get()->pluck('data.event')->contains('payment_requested'));
    }

    public function test_only_the_project_manager_or_admin_defines_extra_sales_fields(): void
    {
        $this->as($this->sales)->postJson('/api/project-custom-fields', ['label' => 'GST number', 'type' => 'text'])->assertForbidden();
        $this->as($this->manager)->postJson('/api/project-custom-fields', ['label' => 'GST number', 'type' => 'text', 'required' => true])->assertCreated();
        $fid = $this->as($this->sales)->getJson('/api/project-custom-fields')->assertOk()->json('data.0.id');

        $body = ['name' => 'With extra', 'client_name' => 'Acme', 'site_category' => 'CMS', 'platform' => 'WordPress', 'pages_count' => 10, 'budget' => 100000];
        $this->as($this->sales)->postJson('/api/sales/projects', $body)->assertStatus(422); // required extra field missing
        $id = $this->as($this->sales)->postJson('/api/sales/projects', $body + ['custom' => [$fid => '32ABC']])->assertCreated()->json('data.id');
        $this->assertSame('32ABC', \App\Models\ProjectIntake::where('project_id', $id)->first()->details['custom']['GST number']);
    }
}
