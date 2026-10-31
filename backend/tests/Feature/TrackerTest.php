<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectBudgetAllocation;
use App\Models\Team;
use App\Models\User;
use App\Support\Feature;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/** Design / Frontend (HTML) / Dev tables on a project, and QA requests raised from Frontend and Dev. */
class TrackerTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;
    private User $designer;
    private User $htmlLead;
    private User $phpDev;
    private User $qaLead;
    private User $tester;
    private Project $project;

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'Super Admin']);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        Feature::set('workflow', true);

        $pmo = Team::create(['name' => 'PMO 1']);
        $this->manager = User::factory()->create(['team_id' => $pmo->id]);
        $pmo->update(['team_lead_id' => $this->manager->id]);
        $design = Team::create(['name' => 'Design']);
        $html = Team::create(['name' => 'HTML']);
        $php = Team::create(['name' => 'PHP']);
        $qa = Team::create(['name' => 'QA']);
        $this->designer = User::factory()->create(['team_id' => $design->id]);
        $this->htmlLead = User::factory()->create(['team_id' => $html->id]);
        $html->update(['team_lead_id' => $this->htmlLead->id]);
        $this->phpDev = User::factory()->create(['team_id' => $php->id]);
        $this->qaLead = User::factory()->create(['team_id' => $qa->id]);
        $qa->update(['team_lead_id' => $this->qaLead->id]);
        $this->tester = User::factory()->create(['team_id' => $qa->id]);

        $this->project = Project::create(['name' => 'Acme', 'status' => 'Active', 'start_date' => now()->toDateString(), 'created_by' => $this->manager->id]);
        foreach ([[$design, 5], [$html, 10], [$php, 4]] as [$t, $days]) {
            ProjectBudgetAllocation::create(['project_id' => $this->project->id, 'team_id' => $t->id, 'amount' => $days]);
        }
    }

    private function as(User $user): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer ' . $user->createToken('t')->plainTextToken);
    }

    private function url(string $kind): string
    {
        return "/api/work/projects/{$this->project->id}/tracker/{$kind}";
    }

    public function test_design_table_crud_with_fetched_header_figures(): void
    {
        $r = $this->as($this->designer)->postJson($this->url('design'), ['name' => 'Home', 'priority' => 'P0', 'status' => 'In progress', 'client_status' => 'Shared', 'days' => 2, 'members' => [$this->designer->id], 'link' => 'https://figma.com/x'])->assertCreated();
        $id = $r->json('data.id');
        $this->as($this->designer)->postJson($this->url('design'), ['name' => 'Bad', 'status' => 'Whatever'])->assertStatus(422);

        $idx = $this->as($this->designer)->getJson($this->url('design'))->assertOk();
        $this->assertEquals(5, $idx->json('summary.allocated_days'));   // from the project manager's split, not typed
        $this->assertEquals(2, $idx->json('summary.used_days'));
        $this->assertEquals(3, $idx->json('summary.deviation_days'));
        $this->assertSame('P0', $idx->json('rows.0.priority'));

        $this->as($this->phpDev)->putJson("/api/work/tracker/rows/{$id}", ['status' => 'Completed'])->assertForbidden(); // not the design team
        $this->as($this->designer)->putJson("/api/work/tracker/rows/{$id}", ['status' => 'Completed'])->assertOk();
        $this->as($this->designer)->deleteJson("/api/work/tracker/rows/{$id}")->assertOk();
        $this->assertDatabaseMissing('work_tracker_rows', ['id' => $id]);
    }

    public function test_frontend_timeline_sums_subtasks_and_shows_deviation_and_dev_is_separate(): void
    {
        $id = $this->as($this->htmlLead)->postJson($this->url('frontend'), ['name' => 'Home', 'members' => [$this->htmlLead->id], 'subtasks' => [['title' => 'Header', 'hours' => 8], ['title' => 'Footer', 'hours' => 4]]])->assertCreated()->json('data.id');
        $this->as($this->htmlLead)->postJson("/api/work/tracker/rows/{$id}/subtasks", ['title' => 'Slider', 'hours' => 12])->assertCreated();

        $s = $this->as($this->htmlLead)->getJson($this->url('frontend'))->assertOk()->json('summary');
        $this->assertEquals(10, $s['allocated_days']);            // the HTML department only, not the PHP team
        $this->assertEquals(24, $s['used_hours']);                // 8 + 4 + 12
        $this->assertEquals(3, $s['used_days']);
        $this->assertEquals(7, $s['deviation_days']);

        $this->as($this->phpDev)->postJson($this->url('dev'), ['name' => 'API', 'work_type' => 'Dev-Backend API', 'status' => 'In progress', 'hours' => 40, 'members' => [$this->phpDev->id]])->assertCreated();
        $dev = $this->as($this->phpDev)->getJson($this->url('dev'))->assertOk()->json('summary');
        $this->assertEquals(4, $dev['allocated_days']);           // PHP is Dev, HTML is not
        $this->assertEquals(5, $dev['used_days']);                // 40 hrs
        $this->assertEquals(-1, $dev['deviation_days']);          // over by a day
        $this->as($this->phpDev)->postJson($this->url('dev'), ['name' => 'X', 'work_type' => 'Nope'])->assertStatus(422);
    }

    public function test_qa_request_goes_to_the_qa_lead_who_assigns_a_member(): void
    {
        $id = $this->as($this->phpDev)->postJson($this->url('dev'), ['name' => 'Checkout API', 'work_type' => 'Backend'])->assertCreated()->json('data.id');

        $q = $this->as($this->phpDev)->postJson("/api/work/tracker/rows/{$id}/qa-request", ['note' => 'Ready'])->assertCreated()->json('data.id');
        $this->as($this->phpDev)->postJson("/api/work/tracker/rows/{$id}/qa-request")->assertStatus(422); // already open
        $this->assertTrue($this->qaLead->notifications()->get()->pluck('data.event')->contains('qa_requested'));

        $this->as($this->phpDev)->postJson("/api/work/qa-requests/{$q}/assign", ['assigned_to' => $this->tester->id])->assertForbidden();
        $this->as($this->qaLead)->postJson("/api/work/qa-requests/{$q}/assign", ['assigned_to' => $this->tester->id])->assertOk()->assertJsonPath('data.status', 'Assigned');
        $this->assertTrue($this->tester->notifications()->get()->pluck('data.event')->contains('qa_assigned'));

        $this->as($this->tester)->postJson("/api/work/qa-requests/{$q}/status", ['status' => 'Done'])->assertOk();
        $this->assertTrue($this->phpDev->notifications()->get()->pluck('data.event')->contains('qa_done'));

        // Design has no QA request.
        $d = $this->as($this->designer)->postJson($this->url('design'), ['name' => 'Home'])->json('data.id');
        $this->as($this->designer)->postJson("/api/work/tracker/rows/{$d}/qa-request")->assertNotFound();
    }
}
