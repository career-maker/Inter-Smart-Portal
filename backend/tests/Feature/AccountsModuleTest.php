<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Project;
use App\Models\User;
use App\Support\Feature;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AccountsModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $accounts;
    private User $employee;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (['Super Admin', 'HR', 'Employee'] as $r) {
            Role::firstOrCreate(['name' => $r]);
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // 'Accounts' role comes from the module migration itself.
        $this->assertTrue(Role::where('name', 'Accounts')->exists());

        $this->accounts = User::factory()->create();
        $this->accounts->assignRole('Accounts');
        $this->employee = User::factory()->create();
        $this->employee->assignRole('Employee');
        $this->admin = User::factory()->create();
        $this->admin->assignRole('Super Admin');
    }

    private function as(User $user): static
    {
        $this->app['auth']->forgetGuards(); // the guard remembers the previous user within one test

        return $this->withHeader('Authorization', 'Bearer ' . $user->createToken('t')->plainTextToken);
    }

    private function project(array $extra = []): Project
    {
        return Project::create($extra + [
            'name' => 'Proj ' . uniqid(), 'status' => 'Active',
            'start_date' => now()->toDateString(), 'created_by' => $this->admin->id,
        ]);
    }

    public function test_module_is_hidden_until_the_flag_is_on_and_limited_to_accounts_and_admin(): void
    {
        $this->as($this->admin)->getJson('/api/accounts/projects')->assertStatus(404);

        Feature::set('accounts', true);
        $this->as($this->employee)->getJson('/api/accounts/projects')->assertStatus(403);
        $this->as($this->accounts)->getJson('/api/accounts/projects')->assertOk();
        $this->as($this->admin)->getJson('/api/accounts/projects')->assertOk();
    }

    public function test_features_endpoint_reports_the_flag(): void
    {
        $this->as($this->employee)->getJson('/api/features')->assertOk()->assertJson(['accounts' => false]);
        Feature::set('accounts', true);
        $this->as($this->employee)->getJson('/api/features')->assertOk()->assertJson(['accounts' => true]);
    }

    public function test_payment_flow_moves_state_and_notifies_sales_and_coordinator(): void
    {
        Feature::set('accounts', true);
        $sales = User::factory()->create();
        $coordinator = User::factory()->create();
        $project = $this->project(['project_coordinator_id' => $coordinator->id]);

        $this->as($this->accounts)->putJson("/api/accounts/projects/{$project->id}/finance", [
            'contract_value' => 1000, 'sales_user_id' => $sales->id,
        ])->assertOk();

        $state = fn () => collect($this->as($this->accounts)->getJson('/api/accounts/projects')->json('data'))->firstWhere('id', $project->id);
        $this->assertSame('Advance awaiting', $state()['state']);

        $advance = $this->as($this->accounts)->postJson("/api/accounts/projects/{$project->id}/payments", ['kind' => 'advance', 'amount' => 300])->assertCreated()->json('data.id');
        $this->as($this->accounts)->postJson("/api/accounts/payments/{$advance}/approve")->assertOk()->assertJsonPath('data.status', 'Approved');

        $this->assertSame('Pending payment', $state()['state']);
        $this->assertSame(700.0, (float) $state()['balance']);
        $this->assertSame(1, $sales->notifications()->count());
        $this->assertSame(1, $coordinator->notifications()->count());
        $this->assertSame('payment_approved', $sales->notifications()->first()->data['event']);

        // approving the same payment twice is refused
        $this->as($this->accounts)->postJson("/api/accounts/payments/{$advance}/approve")->assertStatus(422);

        $rest = $this->as($this->accounts)->postJson("/api/accounts/projects/{$project->id}/payments", ['kind' => 'final', 'amount' => 700])->json('data.id');
        $this->as($this->accounts)->postJson("/api/accounts/payments/{$rest}/approve")->assertOk();
        $this->assertSame('Paid in full', $state()['state']);
    }

    public function test_rejecting_a_payment_needs_a_reason_and_does_not_count_as_received(): void
    {
        Feature::set('accounts', true);
        $project = $this->project();
        $this->as($this->accounts)->putJson("/api/accounts/projects/{$project->id}/finance", ['contract_value' => 500]);
        $p = $this->as($this->accounts)->postJson("/api/accounts/projects/{$project->id}/payments", ['kind' => 'advance', 'amount' => 100])->json('data.id');

        $this->as($this->accounts)->postJson("/api/accounts/payments/{$p}/reject")->assertStatus(422);
        $this->as($this->accounts)->postJson("/api/accounts/payments/{$p}/reject", ['reason' => 'Bank slip unclear'])->assertOk()->assertJsonPath('data.status', 'Rejected');

        $row = collect($this->as($this->accounts)->getJson('/api/accounts/projects')->json('data'))->firstWhere('id', $project->id);
        $this->assertSame('Advance awaiting', $row['state']);
        $this->assertSame(0.0, (float) $row['received']);
    }

    public function test_budget_increase_is_logged_and_notifies_management_and_hr(): void
    {
        Feature::set('accounts', true);
        $hr = User::factory()->create();
        $hr->assignRole('HR');
        $project = $this->project();
        $this->as($this->accounts)->putJson("/api/accounts/projects/{$project->id}/finance", ['contract_value' => 1000]);

        $this->as($this->accounts)->postJson("/api/accounts/projects/{$project->id}/budget-increase", ['new_value' => 900, 'reason' => 'x'])->assertStatus(422);
        $this->as($this->accounts)->postJson("/api/accounts/projects/{$project->id}/budget-increase", ['new_value' => 1500, 'reason' => 'Extra pages'])->assertOk()->assertJsonPath('data.contract_value', '1500.00');

        $this->assertDatabaseHas('project_budget_changes', ['project_id' => $project->id, 'old_value' => 1000, 'new_value' => 1500, 'reason' => 'Extra pages']);
        $this->assertSame(1, $hr->notifications()->count());
        $this->assertSame(1, $this->admin->notifications()->count());
    }

    public function test_hold_and_terminate_change_status_with_a_reason_and_are_audited(): void
    {
        Feature::set('accounts', true);
        $project = $this->project();

        $this->as($this->accounts)->postJson("/api/accounts/projects/{$project->id}/status", ['status' => 'On Hold'])->assertStatus(422);
        $this->as($this->accounts)->postJson("/api/accounts/projects/{$project->id}/status", ['status' => 'Completed', 'reason' => 'x'])->assertStatus(422);
        $this->as($this->accounts)->postJson("/api/accounts/projects/{$project->id}/status", ['status' => 'On Hold', 'reason' => 'Client unresponsive'])->assertOk();

        $this->assertSame('On Hold', $project->fresh()->status);
        $this->assertTrue(AuditLog::where('action', 'changed project status')->where('model_id', $project->id)->exists());
    }

    public function test_targets_upsert_per_person_per_month_and_amc_shows_expired(): void
    {
        Feature::set('accounts', true);
        $seller = User::factory()->create();

        $this->as($this->accounts)->postJson('/api/accounts/targets', ['user_id' => $seller->id, 'period' => '2026-11', 'target_amount' => 100000])->assertCreated();
        $this->as($this->accounts)->postJson('/api/accounts/targets', ['user_id' => $seller->id, 'period' => '2026-11', 'target_amount' => 150000])->assertCreated();
        $this->as($this->accounts)->postJson('/api/accounts/targets', ['user_id' => $seller->id, 'period' => '2026-13', 'target_amount' => 1])->assertStatus(422);
        $this->assertDatabaseCount('sales_targets', 1);
        $this->assertSame('150000.00', $this->as($this->accounts)->getJson('/api/accounts/targets?period=2026-11')->json('data.0.target_amount'));

        $project = $this->project();
        $this->as($this->accounts)->postJson('/api/accounts/amc', [
            'project_id' => $project->id, 'start_date' => '2025-01-01', 'end_date' => '2025-12-31', 'amount' => 5000,
        ])->assertCreated();
        $this->assertSame('Expired', $this->as($this->accounts)->getJson('/api/accounts/amc')->json('data.0.effective_status'));
    }
}
