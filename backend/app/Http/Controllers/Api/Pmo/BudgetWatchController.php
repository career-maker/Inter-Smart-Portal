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
        if (! Access::can('pmo_budget_views', $request->user())) {
            $m = 'Only the project manager can see the out-of-budget list.';

            return response()->json(['message' => $m, 'errors' => ['budget' => [$m]]], 403);
        }

        $over = [];
        $near = [];
        foreach ($this->rows() as $row) {
            if ($row['used'] > $row['budget'] || collect($row['departments'])->contains('over', true)) {
                $over[] = $row;
            } elseif ($row['used'] >= $row['budget'] * self::NEAR_PERCENT / 100) {
                $near[] = $row;
            }
        }
        usort($over, fn ($a, $b) => $b['overrun'] <=> $a['overrun']);
        usort($near, fn ($a, $b) => $b['percent'] <=> $a['percent']);

        return response()->json(['over' => $over, 'near' => $near, 'near_percent' => self::NEAR_PERCENT]);
    }

    /** Project board for the manager: every open project with its stage and the budget left. Moves go through the hold and resume endpoints. */
    public function tracker(Request $request)
    {
        if (! Access::can('pmo_budget_views', $request->user())) {
            $m = 'Only the project manager can use the tracker.';

            return response()->json(['message' => $m, 'errors' => ['tracker' => [$m]]], 403);
        }
        $rows = collect($this->rows(true))->keyBy('id');
        $others = Project::whereNotIn('id', $rows->keys())->whereIn('status', ['Planning', 'Active', 'On Hold'])->get(['id', 'name', 'status'])
            ->map(fn ($p) => ['id' => $p->id, 'name' => $p->name, 'status' => $p->status, 'budget' => 0.0, 'used' => 0.0, 'left' => 0.0, 'percent' => null]);

        return response()->json(['data' => $rows->values()->concat($others)->whereIn('status', ['Planning', 'Active', 'On Hold', 'Completed'])->values(), 'stages' => ['Planning', 'Active', 'On Hold', 'Completed']]);
    }

    /** One row per project that has a budget: totals and the per-department breakdown. Completed and cancelled projects are left out unless asked for. */
    private function rows(bool $includeClosed = false): array
    {
        $alloc = ProjectBudgetAllocation::where('amount', '>', 0)->get()->groupBy('project_id');
        // person-days: items of approved sprints plus approved corrections/changes
        $sprints = \DB::table('sprint_items')->join('work_sprints', 'work_sprints.id', '=', 'sprint_items.sprint_id')->whereIn('work_sprints.status', WorkSprint::OPEN_STATUSES)->whereIn('work_sprints.project_id', $alloc->keys())
            ->selectRaw('work_sprints.project_id, work_sprints.team_id, sum(sprint_items.effort_days) as c')->groupBy('work_sprints.project_id', 'work_sprints.team_id')->get();
        $changes = WorkChange::whereIn('status', WorkChange::COUNTED)->whereIn('project_id', $alloc->keys())->selectRaw('project_id, team_id, sum(effort_days) as c')->groupBy('project_id', 'team_id')->get();
        $used = [];
        foreach ($sprints->concat($changes) as $r) {
            $used[$r->project_id][$r->team_id] = ($used[$r->project_id][$r->team_id] ?? 0) + (float) $r->c;
        }
        $projects = Project::whereIn('id', $alloc->keys())->when(! $includeClosed, fn ($q) => $q->whereNotIn('status', ['Completed', 'Cancelled']))->get()->keyBy('id');
        $teams = Team::pluck('name', 'id');

        $rows = [];
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
            $rows[] = $row + ['status' => $p->status, 'left' => $budget - $spent];
        }

        return $rows;
    }
}
