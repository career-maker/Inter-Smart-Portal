<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\Team;
use App\Models\User;
use App\Support\Feature;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class SalesModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $ann;      // Sales team lead
    private User $ravi;     // Sales team member
    private User $accounts;
    private User $admin;
    private User $other;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (['Super Admin', 'Employee'] as $r) {
            Role::firstOrCreate(['name' => $r]);
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $sales = Team::create(['name' => 'Sales']);
        $this->ravi = User::factory()->create(['team_id' => $sales->id]);
        $this->ann = User::factory()->create(['team_id' => $sales->id]);
        $sales->update(['team_lead_id' => $this->ann->id]);
        $this->accounts = User::factory()->create(['team_id' => Team::create(['name' => 'Accounts'])->id]);
        $this->other = User::factory()->create(['team_id' => Team::create(['name' => 'HTML'])->id]);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('Super Admin');
        Feature::set('sales', true);
        Feature::set('accounts', true);
    }

    private function as(User $user): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer ' . $user->createToken('t')->plainTextToken);
    }

    private function intake(array $extra = []): array
    {
        return $extra + [
            'name' => 'Acme Website', 'client_name' => 'Acme Ltd', 'site_category' => 'CMS', 'platform' => 'WordPress',
            'pages_count' => 12, 'quality_level' => 'Standard', 'budget' => 80000,
        ];
    }

    public function test_hidden_until_flag_on_and_only_for_sales_team_and_admin(): void
    {
        Feature::set('sales', false);
        $this->as($this->ravi)->getJson('/api/sales/leads')->assertStatus(404);

        Feature::set('sales', true);
        $this->as($this->ravi)->getJson('/api/sales/leads')->assertOk();
        $this->as($this->admin)->getJson('/api/sales/leads')->assertOk();
        $this->as($this->other)->getJson('/api/sales/leads')->assertStatus(403);
        $this->as($this->accounts)->getJson('/api/sales/leads')->assertStatus(403);

        $this->as($this->ravi)->getJson('/api/features')->assertJson(['sales' => true, 'accounts' => false]);
        $this->as($this->accounts)->getJson('/api/features')->assertJson(['sales' => false, 'accounts' => true]);
    }

    public function test_salesperson_sees_own_leads_while_team_lead_and_admin_see_all(): void
    {
        $this->as($this->ravi)->postJson('/api/sales/leads', ['name' => 'Ravi Lead', 'expected_value' => 1000])->assertCreated();
        $this->as($this->ann)->postJson('/api/sales/leads', ['name' => 'Ann Lead'])->assertCreated();

        $this->assertCount(1, $this->as($this->ravi)->getJson('/api/sales/leads')->json('data'));
        $this->assertCount(2, $this->as($this->ann)->getJson('/api/sales/leads')->json('data'));
        $this->assertCount(2, $this->as($this->admin)->getJson('/api/sales/leads')->json('data'));

        $annLead = Lead::where('name', 'Ann Lead')->first();
        $this->as($this->ravi)->putJson("/api/sales/leads/{$annLead->id}", ['status' => 'Hot'])->assertStatus(403);
    }

    public function test_lost_lead_needs_a_reason(): void
    {
        $id = $this->as($this->ravi)->postJson('/api/sales/leads', ['name' => 'L'])->json('data.id');
        $this->as($this->ravi)->putJson("/api/sales/leads/{$id}", ['status' => 'Lost'])->assertStatus(422);
        $this->as($this->ravi)->putJson("/api/sales/leads/{$id}", ['status' => 'Lost', 'lost_reason' => 'Budget too low'])->assertOk();
    }

    public function test_inbox_items_can_be_filtered_and_completed_with_an_outcome(): void
    {
        $id = $this->as($this->ravi)->postJson('/api/sales/leads', ['name' => 'L'])->json('data.id');
        $a = $this->as($this->ravi)->postJson("/api/sales/leads/{$id}/activities", ['kind' => 'proposal', 'title' => 'Send proposal', 'due_at' => now()->toDateString()])->assertCreated()->json('data.id');
        $this->as($this->ravi)->postJson("/api/sales/leads/{$id}/activities", ['kind' => 'meeting', 'title' => 'Demo call'])->assertCreated();

        $this->assertCount(2, $this->as($this->ravi)->getJson('/api/sales/inbox')->json('data'));
        $this->assertCount(1, $this->as($this->ravi)->getJson('/api/sales/inbox?kind=proposal')->json('data'));

        $next = now()->addDays(3)->toDateString();
        $this->as($this->ravi)->putJson("/api/sales/activities/{$a}", ['status' => 'Done', 'outcome' => 'Client will revert', 'next_followup_at' => $next])->assertOk();
        $this->as($this->ravi)->putJson("/api/sales/activities/{$a}", ['status' => 'Done'])->assertStatus(422); // already done

        $this->assertCount(1, $this->as($this->ravi)->getJson('/api/sales/inbox')->json('data'));
        $this->assertSame($next, Lead::find($id)->next_followup_at->toDateString());
    }

    public function test_creating_a_project_links_sales_person_and_tells_accounts(): void
    {
        $leadId = $this->as($this->ravi)->postJson('/api/sales/leads', ['name' => 'Acme'])->json('data.id');

        $res = $this->as($this->ravi)->postJson('/api/sales/projects', $this->intake(['lead_id' => $leadId]))->assertCreated();
        $projectId = $res->json('data.id');

        $this->assertSame('Planning', Project::find($projectId)->status);
        $this->assertSame('Won', Lead::find($leadId)->status);
        $this->assertSame($projectId, Lead::find($leadId)->converted_project_id);
        $this->assertSame(1, $this->accounts->notifications()->count());
        $this->assertSame('project_created', $this->accounts->notifications()->first()->data['event']);

        // Accounts immediately sees it awaiting an advance, linked to the salesperson.
        $row = collect($this->as($this->accounts)->getJson('/api/accounts/projects')->json('data'))->firstWhere('id', $projectId);
        $this->assertSame('Advance awaiting', $row['state']);
        $this->assertSame($this->ravi->id, $row['sales_user_id']);

        // ...and when Accounts approves the advance, the salesperson is told.
        $p = $this->as($this->accounts)->postJson("/api/accounts/projects/{$projectId}/payments", ['kind' => 'advance', 'amount' => 20000])->json('data.id');
        $this->as($this->accounts)->postJson("/api/accounts/payments/{$p}/approve")->assertOk();
        $this->assertSame('payment_approved', $this->ravi->notifications()->first()->data['event']);
    }

    public function test_project_intake_rules(): void
    {
        $this->as($this->ravi)->postJson('/api/sales/projects', $this->intake(['site_category' => 'Spaceship']))->assertStatus(422);
        $this->as($this->ravi)->postJson('/api/sales/projects', $this->intake(['cms_variant' => 'Copy of other website', 'pages_count' => null]))->assertStatus(422);

        $this->as($this->ravi)->postJson('/api/sales/projects', $this->intake())->assertCreated();
        $this->as($this->ravi)->postJson('/api/sales/projects', $this->intake(['name' => '  acme website ']))->assertStatus(422); // same name, any case
    }

    public function test_sales_project_list_shows_payment_state_and_progress_and_is_scoped(): void
    {
        $id = $this->as($this->ravi)->postJson('/api/sales/projects', $this->intake())->json('data.id');
        $this->as($this->ann)->postJson('/api/sales/projects', $this->intake(['name' => 'Ann Project']))->assertCreated();

        foreach (['Completed', 'In Progress'] as $i => $status) {
            ProjectTask::create(['project_id' => $id, 'title' => "T{$i}", 'status' => $status, 'created_by' => $this->ravi->id]);
        }

        $mine = $this->as($this->ravi)->getJson('/api/sales/projects')->json('data');
        $this->assertCount(1, $mine);
        $this->assertSame(50, $mine[0]['progress_percent']);
        $this->assertSame('Advance awaiting', $mine[0]['state']);
        $this->assertCount(2, $this->as($this->ann)->getJson('/api/sales/projects')->json('data'));

        // A project Accounts set up with no salesperson is not a Sales project.
        $orphan = Project::create(['name' => 'No seller', 'status' => 'Active', 'start_date' => now()->toDateString(), 'created_by' => $this->admin->id]);
        \App\Models\ProjectFinance::create(['project_id' => $orphan->id, 'contract_value' => 999]);
        $this->assertCount(2, $this->as($this->ann)->getJson('/api/sales/projects')->json('data'));
    }

    public function test_hold_and_terminate_need_a_reason_own_project_only_and_notify_accounts(): void
    {
        $id = $this->as($this->ann)->postJson('/api/sales/projects', $this->intake())->json('data.id');

        $this->as($this->ravi)->postJson("/api/sales/projects/{$id}/status", ['status' => 'On Hold', 'reason' => 'x'])->assertStatus(403);
        $this->as($this->ann)->postJson("/api/sales/projects/{$id}/status", ['status' => 'On Hold'])->assertStatus(422);
        $this->as($this->ann)->postJson("/api/sales/projects/{$id}/status", ['status' => 'On Hold', 'reason' => 'Client not responding'])->assertOk();

        $this->assertSame('On Hold', Project::find($id)->status);
        $this->assertSame(2, $this->accounts->notifications()->count()); // created + status changed
    }

    public function test_dashboard_counts(): void
    {
        $this->as($this->ravi)->postJson('/api/sales/leads', ['name' => 'a', 'status' => 'Hot']);
        $this->as($this->ravi)->postJson('/api/sales/leads', ['name' => 'b', 'status' => 'Ready to close', 'expected_value' => 5000]);
        $this->as($this->ravi)->postJson('/api/sales/leads', ['name' => 'c', 'status' => 'Follow up']);
        $lost = $this->as($this->ravi)->postJson('/api/sales/leads', ['name' => 'd'])->json('data.id');
        $this->as($this->ravi)->putJson("/api/sales/leads/{$lost}", ['status' => 'Lost', 'lost_reason' => 'n/a']);
        $this->as($this->ravi)->postJson('/api/sales/projects', $this->intake(['lead_id' => $this->as($this->ravi)->postJson('/api/sales/leads', ['name' => 'e'])->json('data.id')]));
        $this->as($this->accounts)->postJson('/api/accounts/targets', ['user_id' => $this->ravi->id, 'period' => now()->format('Y-m'), 'target_amount' => 100000]);

        $d = $this->as($this->ravi)->getJson('/api/sales/dashboard')->assertOk()->json();
        $this->assertSame(1, $d['leads']['hot']);
        $this->assertSame(1, $d['leads']['ready_to_close']);
        $this->assertSame(5000.0, (float) $d['leads']['ready_to_close_value']);
        $this->assertSame(1, $d['leads']['follow_up']);
        $this->assertSame(50.0, (float) $d['conversion_percent']); // 1 won, 1 lost
        $this->assertEquals(100000, $d['target']['target']);
        $this->assertEquals(80000, $d['target']['achieved']);
        $this->assertSame(1, $d['projects_ongoing']);
    }

    public function test_sheet_answers_are_saved_and_only_sheet_values_are_accepted(): void
    {
        $ok = $this->as($this->ravi)->postJson('/api/sales/projects', $this->intake(['budget_cap' => 120000, 'details' => ['project_type' => 'CMS_Word_Cust_10', 'online_chat' => 'Yes', 'poc_name' => 'Asha']]));
        $ok->assertCreated();
        $this->assertSame('Yes', \App\Models\ProjectIntake::first()->details['online_chat']);
        $this->assertEquals(120000, \App\Models\ProjectIntake::first()->budget_cap);

        $this->as($this->ravi)->postJson('/api/sales/projects', $this->intake(['name' => 'Other', 'details' => ['online_chat' => 'Maybe']]))
            ->assertStatus(422)->assertJsonPath('errors.details.0', '"Maybe" is not an allowed answer for online_chat.');
        $this->as($this->ravi)->postJson('/api/sales/projects', $this->intake(['name' => 'Third', 'details' => ['made_up' => 'x']]))->assertStatus(422);
    }
}
