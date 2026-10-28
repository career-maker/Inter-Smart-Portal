<?php

namespace Tests\Feature;

use App\Models\AmcContract;
use App\Models\Project;
use App\Models\ProjectFinance;
use App\Models\Team;
use App\Models\User;
use App\Support\Feature;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class CompletedProjectAmcTest extends TestCase
{
    use RefreshDatabase;

    public function test_sales_sees_live_projects_with_amc_and_gets_one_reminder(): void
    {
        Role::firstOrCreate(['name' => 'Super Admin']);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        Feature::set('sales', true);

        $sales = Team::create(['name' => 'Sales']);
        $ravi = User::factory()->create(['team_id' => $sales->id]);
        $other = User::factory()->create(['team_id' => $sales->id]);
        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');

        $live = Project::create(['name' => 'Live site', 'status' => 'Active', 'start_date' => now()->toDateString(), 'created_by' => $admin->id]);
        $notLive = Project::create(['name' => 'Still building', 'status' => 'Active', 'start_date' => now()->toDateString(), 'created_by' => $admin->id]);
        foreach ([$live, $notLive] as $p) {
            ProjectFinance::create(['project_id' => $p->id, 'contract_value' => 1000, 'sales_user_id' => $ravi->id]);
        }
        DB::table('project_go_live')->insert(['project_id' => $live->id, 'status' => 'Live', 'live_at' => now(), 'created_at' => now(), 'updated_at' => now()]);

        // only the live project is listed, and without an AMC yet
        $rows = $this->as($ravi)->getJson('/api/sales/completed')->assertOk()->json('data');
        $this->assertCount(1, $rows);
        $this->assertSame('No AMC', $rows[0]['amc_status']);

        // another salesperson cannot set it; renewal must be after the start
        $this->as($other)->putJson("/api/sales/projects/{$live->id}/amc", ['amc_start' => '2026-01-01', 'renewal_date' => '2027-01-01', 'amount' => 5000])->assertStatus(403);
        $this->as($ravi)->putJson("/api/sales/projects/{$live->id}/amc", ['amc_start' => '2026-01-01', 'renewal_date' => '2025-01-01', 'amount' => 5000])->assertStatus(422);

        // AMC ending in 10 days shows as expiring soon
        $this->as($ravi)->putJson("/api/sales/projects/{$live->id}/amc", ['amc_start' => now()->subYear()->toDateString(), 'renewal_date' => now()->addDays(10)->toDateString(), 'amount' => 5000])->assertOk();
        $row = $this->as($ravi)->getJson('/api/sales/completed')->json('data.0');
        $this->assertSame('Expiring soon', $row['amc_status']);
        $this->assertEquals(5000, $row['amc_amount']);
        $this->assertSame(1, AmcContract::count());

        // reminder goes out once
        $this->artisan('sales:amc-reminders')->assertSuccessful();
        $this->artisan('sales:amc-reminders')->assertSuccessful();
        $this->assertSame(1, $ravi->notifications()->count());

        // a new renewal date re-arms the reminder
        $this->as($ravi)->putJson("/api/sales/projects/{$live->id}/amc", ['amc_start' => now()->subYear()->toDateString(), 'renewal_date' => now()->addDays(20)->toDateString(), 'amount' => 5000])->assertOk();
        $this->artisan('sales:amc-reminders')->assertSuccessful();
        $this->assertSame(2, $ravi->notifications()->count());
    }

    /** Sign in with a real bearer token, like the other feature tests (CheckEmployeeStatus needs a personal access token). */
    private function as(User $user): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer ' . $user->createToken('t')->plainTextToken);
    }
}
