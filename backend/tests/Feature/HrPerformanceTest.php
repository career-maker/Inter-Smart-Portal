<?php

namespace Tests\Feature;

use App\Models\Team;
use App\Models\User;
use App\Support\Feature;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class HrPerformanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_hr_sees_raw_figures_and_others_are_refused(): void
    {
        Role::firstOrCreate(['name' => 'Super Admin']);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        Feature::set('hr_performance', true);

        $hr = Team::create(['name' => 'HR']);
        $html = Team::create(['name' => 'HTML']);
        $hrUser = User::factory()->create(['team_id' => $hr->id]);
        \App\Support\Access::saveSetting('hr', [$hrUser->id], []); // HR is chosen by the Super Admin, not by team
        $lead = User::factory()->create(['team_id' => $html->id]);
        $dev = User::factory()->create(['team_id' => $html->id]);
        $project = \App\Models\Project::create(['name' => 'Acme', 'status' => 'Active', 'start_date' => now()->toDateString(), 'created_by' => $lead->id]);
        $sprint = \App\Models\WorkSprint::create(['project_id' => $project->id, 'team_id' => $html->id, 'title' => 's', 'status' => 'Approved', 'end_date' => now()->subDays(5)->toDateString(), 'created_by' => $lead->id]);
        $item = fn ($t, $status, $effort, $spent) => \App\Models\SprintItem::create(['sprint_id' => $sprint->id, 'title' => $t, 'status' => $status, 'effort_days' => $effort, 'time_spent_days' => $spent, 'assigned_to' => $dev->id]);
        $item('late', 'Approved', 2, 3); // finished after the sprint end, over effort
        $item('open', 'Pending', 1, 0);
        DB::table('team_feedback')->insert(['user_id' => $dev->id, 'given_by' => $lead->id, 'team_id' => $html->id, 'month' => '2026-10', 'attitude' => 4, 'attire' => 4, 'learning' => 5, 'on_time' => 3, 'created_at' => now(), 'updated_at' => now()]);

        $this->as($lead)->getJson('/api/hr/performance')->assertStatus(403);

        $row = collect($this->as($hrUser)->getJson('/api/hr/performance')->assertOk()->json('data'))->firstWhere('id', $dev->id);
        $this->assertSame(2, $row['tasks_assigned']);
        $this->assertSame(1, $row['tasks_done']);
        $this->assertSame(1, $row['tasks_done_late']);
        $this->assertEquals(1, $row['effort_variance_days']);
        $this->assertEquals(4.0, $row['feedback_latest_avg']);
        $this->assertArrayNotHasKey('rating', $row);
    }

    /** Sign in with a real bearer token, like the other feature tests (CheckEmployeeStatus needs a personal access token). */
    private function as(User $user): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer ' . $user->createToken('t')->plainTextToken);
    }
}
