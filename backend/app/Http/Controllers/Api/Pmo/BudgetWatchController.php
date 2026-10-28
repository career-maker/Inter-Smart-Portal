<?php

namespace App\Http\Controllers\Api\Pmo;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectBudgetAllocation;
use App\Models\Team;
use App\Models\WorkChange;
use App\Models\WorkSprint;
use App\Support\Access;
use Illuminate\Http\Request;

/**
 * Out-of-budget list for project managers: projects whose approved work (open sprints plus counted corrections and changes)
 * costs more than the department budgets, and a separate list of projects nearing that limit.
 */
class BudgetWatchController extends Controller
{
    /** A project is "nearing" the limit from this share of its budget up to the budget itself. */
    public const NEAR_PERCENT = 90;

    public function index(Request $request)
    {
        if (! Access::pmoManager($request->user())) {
            $m = 'Only the project manager can see the out-of-budget list.';

            return response()->json(['message' => $m, 'errors' => ['budget' => [$m]]], 403);
        }

        $alloc = ProjectBudgetAllocation::where('amount', '>', 0)->get()->groupBy('project_id');
        $sprints = WorkSprint::whereIn('status', WorkSprint::OPEN_STATUSES)->whereIn('project_id', $alloc->keys())->selectRaw('project_id, team_id, sum(cost_estimate) as c')->groupBy('project_id', 'team_id')->get();
        $changes = WorkChange::whereIn('status', WorkChange::COUNTED)->whereIn('project_id', $alloc->keys())->selectRaw('project_id, team_id, sum(cost_estimate) as c')->groupBy('project_id', 'team_id')->get();
        $used = [];
        foreach ($sprints->concat($changes) as $r) {
            $used[$r->project_id][$r->team_id] = ($used[$r->project_id][$r->team_id] ?? 0) + (float) $r->c;
        }
        $projects = Project::whereIn('id', $alloc->keys())->whereNotIn('status', ['Completed', 'Cancelled'])->get()->keyBy('id');
        $teams = Team::pluck('name', 'id');

        $over = [];
        $near = [];
        foreach ($projects as $p) {
            $budget = (float) $alloc[$p->id]->sum('amount');
            $spent = array_sum($used[$p->id] ?? []);
            $departments = $alloc[$p->id]->map(fn ($a) => [
                'team' => $teams[$a->team_id] ?? '#' . $a->team_id, 'budget' => (float) $a->amount, 'used' => $u = (float) ($used[$p->id][$a->team_id] ?? 0), 'over' => $u > (float) $a->amount,
            ])->values();
            // work in a department with no budget at all also counts as over
            foreach (($used[$p->id] ?? []) as $teamId => $u) {
                if (! $alloc[$p->id]->contains('team_id', $teamId) && $u > 0) {
                    $departments->push(['team' => $teams[$teamId] ?? '#' . $teamId, 'budget' => 0.0, 'used' => $u, 'over' => true]);
                }
            }
            $row = ['id' => $p->id, 'name' => $p->name, 'budget' => $budget, 'used' => $spent, 'percent' => round(100 * $spent / $budget, 1), 'overrun' => max(0, $spent - $budget), 'departments' => $departments];
            if ($spent > $budget || $departments->contains('over', true)) {
                $over[] = $row;
            } elseif ($spent >= $budget * self::NEAR_PERCENT / 100) {
                $near[] = $row;
            }
        }
        usort($over, fn ($a, $b) => $b['overrun'] <=> $a['overrun']);
        usort($near, fn ($a, $b) => $b['percent'] <=> $a['percent']);

        return response()->json(['over' => $over, 'near' => $near, 'near_percent' => self::NEAR_PERCENT]);
    }
}
