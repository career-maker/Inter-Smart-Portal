<?php

namespace Tests\Feature;

use App\Models\Meeting;
use App\Models\OutOfScopeRequest;
use App\Models\Project;
use App\Models\ProjectFinance;
use App\Models\Team;
use App\Models\User;
use App\Support\Feature;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class SalesOutOfScopeReplyTest extends TestCase
{
    use RefreshDatabase;

    public function test_sales_answers_with_reason_or_requests_a_meeting(): void
    {
        Role::firstOrCreate(['name' => 'Super Admin']);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        Feature::set('sales', true);

        $sales = Team::create(['name' => 'Sales']);
        $pmo = Team::create(['name' => 'PMO 1']);
        $ravi = User::factory()->create(['team_id' => $sales->id]);
        $other = User::factory()->create(['team_id' => $sales->id]);
        $manager = User::factory()->create(['team_id' => $pmo->id]);
        $pmo->update(['team_lead_id' => $manager->id]);
        $pc = User::factory()->create(['team_id' => $pmo->id]);
        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');
        $project = Project::create(['name' => 'Acme', 'status' => 'Active', 'start_date' => now()->toDateString(), 'created_by' => $admin->id, 'project_coordinator_id' => $pc->id]);
        ProjectFinance::create(['project_id' => $project->id, 'contract_value' => 1000, 'sales_user_id' => $ravi->id]);
        $mk = fn () => OutOfScopeRequest::create(['project_id' => $project->id, 'requested_by' => $pc->id, 'description' => 'Add blog', 'effort_days' => 3]);
        $a = $mk();
        $b = $mk();

        // the owning salesperson sees both as action required; another salesperson sees none
        $rows = $this->as($ravi)->getJson('/api/sales/out-of-scope')->assertOk()->json('data');
        $this->assertCount(2, $rows);
        $this->assertTrue($rows[0]['action_required']);
        $this->assertCount(0, $this->as($other)->getJson('/api/sales/out-of-scope')->json('data'));
        $this->as($other)->postJson("/api/sales/out-of-scope/{$a->id}/reply", ['answer' => 'approve', 'reason' => 'ok'])->assertStatus(403);

        // approve/reject need a reason
        $this->as($ravi)->postJson("/api/sales/out-of-scope/{$a->id}/reply", ['answer' => 'approve'])->assertStatus(422);
        $this->as($ravi)->postJson("/api/sales/out-of-scope/{$a->id}/reply", ['answer' => 'approve', 'reason' => 'Client agreed on the price'])->assertOk()->assertJsonPath('data.sales_status', 'Approved');
        // final: cannot answer twice
        $this->as($ravi)->postJson("/api/sales/out-of-scope/{$a->id}/reply", ['answer' => 'reject', 'reason' => 'changed mind'])->assertStatus(422);
        $this->assertGreaterThanOrEqual(1, $manager->notifications()->count()); // Project Office was told

        // meeting: needs times, creates a client meeting with the Project Office invited, can be answered afterwards
        $this->as($ravi)->postJson("/api/sales/out-of-scope/{$b->id}/reply", ['answer' => 'meeting'])->assertStatus(422);
        $this->as($ravi)->postJson("/api/sales/out-of-scope/{$b->id}/reply", ['answer' => 'meeting', 'starts_at' => '2026-11-03 15:00', 'ends_at' => '2026-11-03 15:30'])->assertOk()->assertJsonPath('data.sales_status', 'Meeting requested');
        $m = Meeting::first();
        $this->assertSame('client', $m->kind);
        $this->assertEqualsCanonicalizing([$manager->id, $pc->id, $admin->id], $m->attendees()->pluck('users.id')->all());
        $this->as($ravi)->postJson("/api/sales/out-of-scope/{$b->id}/reply", ['answer' => 'reject', 'reason' => 'Too costly'])->assertOk()->assertJsonPath('data.sales_status', 'Rejected');

        // dashboard counts what is still waiting
        $this->assertSame(0, $this->as($ravi)->getJson('/api/sales/dashboard')->json('out_of_scope_waiting'));
    }

    /** Sign in with a real bearer token, like the other feature tests (CheckEmployeeStatus needs a personal access token). */
    private function as(User $user): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer ' . $user->createToken('t')->plainTextToken);
    }
}
