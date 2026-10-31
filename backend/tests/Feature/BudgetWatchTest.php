<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectBudgetAllocation;
use App\Models\Team;
use App\Models\User;
use App\Models\WorkSprint;
use App\Support\Feature;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class BudgetWatchTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_over_and_near_projects_for_the_manager_only(): void
    {
        Role::firstOrCreate(['name' => 'Super Admin']);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        Feature::set('pmo', true);

        $pmo = Team::create(['name' => 'PMO 1']);
        $html = Team::create(['name' => 'HTML']);
        $manager = User::factory()->create(['team_id' => $pmo->id]);
        $pmo->update(['team_lead_id' => $manager->id]);
        $pc = User::factory()->create(['team_id' => $pmo->id]);
        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');

        $mk = fn ($name, $budget, $cost) => tap(Project::create(['name' => $name, 'status' => 'Active', 'start_date' => now()->toDateString(), 'created_by' => $admin->id]), function ($p) use ($html, $budget, $cost, $admin) {
            ProjectBudgetAllocation::create(['project_id' => $p->id, 'team_id' => $html->id, 'amount' => $budget, 'allocated_by' => $admin->id]);
            $s = WorkSprint::create(['project_id' => $p->id, 'team_id' => $html->id, 'title' => 's', 'status' => 'Approved', 'created_by' => $admin->id]);
            \App\Models\SprintItem::create(['sprint_id' => $s->id, 'title' => 'i', 'effort_days' => $cost]); // person-days
        });
        $mk('Over', 1000, 1200);
        $mk('Near', 1000, 950);
        $mk('Fine', 1000, 500);

        $this->as($pc)->getJson('/api/pmo/budget-watch')->assertStatus(403);

        $r = $this->as($manager)->getJson('/api/pmo/budget-watch')->assertOk();
        $this->assertSame(['Over'], collect($r->json('over'))->pluck('name')->all());
        $this->assertSame(['Near'], collect($r->json('near'))->pluck('name')->all());
        $this->assertEquals(200, $r->json('over.0.overrun'));

        // tracker: manager only, lists every open project with the budget left
        $this->as($pc)->getJson('/api/pmo/tracker')->assertStatus(403);
        $t = collect($this->as($manager)->getJson('/api/pmo/tracker')->assertOk()->json('data'))->keyBy('name');
        $this->assertEquals(500, $t['Fine']['left']);
        $this->assertEquals(-200, $t['Over']['left']);
    }

    /** Sign in with a real bearer token, like the other feature tests (CheckEmployeeStatus needs a personal access token). */
    private function as(User $user): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer ' . $user->createToken('t')->plainTextToken);
    }
}
