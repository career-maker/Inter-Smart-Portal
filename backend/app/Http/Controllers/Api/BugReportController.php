<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PmAddon;
use App\Models\ProjectTask;
use App\Models\Team;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BugReportController extends Controller
{
    /**
     * Get QA Bug Reports across projects, tasks, sprints, and assignees.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin') || strtolower($user->role ?? '') === 'super admin';

        // Check if user has access to bug_tracker addon
        if (!$isSuperAdmin) {
            $teamId = $user->team_id;
            if (!$teamId) {
                $ledTeam = Team::where('team_lead_id', $user->id)->first();
                if ($ledTeam) {
                    $teamId = $ledTeam->id;
                }
            }

            $hasAddon = PmAddon::where('key', 'bug_tracker')
                ->where('is_active', true)
                ->whereHas('teams', function ($q) use ($teamId) {
                    $q->where('teams.id', $teamId);
                })
                ->exists();

            if (!$hasAddon) {
                return response()->json(['message' => 'Bug Tracker add-on is not enabled for your team.'], 403);
            }
        }

        $query = ProjectTask::query()
            ->with([
                'project:id,name,team_id',
                'subPhase:id,name',
                'assignees:id,first_name,last_name,employee_code,team_id',
                'team:id,name',
            ]);

        // Non-super-admins only see tasks relevant to their team or assigned to them
        if (!$isSuperAdmin && isset($teamId) && $teamId) {
            $query->where(function ($q) use ($teamId, $user) {
                $q->where('team_id', $teamId)
                  ->orWhereHas('project', fn ($p) => $p->where('team_id', $teamId))
                  ->orWhereHas('assignees', fn ($a) => $a->where('users.team_id', $teamId)->orWhere('users.id', $user->id));
            });
        }

        // Filters
        if ($request->filled('project_id')) {
            $query->where('project_id', (int) $request->input('project_id'));
        }

        if ($request->filled('assignee_id')) {
            $assigneeId = (int) $request->input('assignee_id');
            $query->whereHas('taskAssignees', fn ($a) => $a->where('user_id', $assigneeId));
        }

        if ($request->filled('sprint')) {
            $query->where('sprint', 'like', '%' . $request->input('sprint') . '%');
        }

        if ($request->filled('has_bugs') && $request->boolean('has_bugs')) {
            $query->where(function ($q) {
                $q->where('total_bugs', '>', 0)
                  ->orWhere('html_bugs', '>', 0)
                  ->orWhere('functional_bugs', '>', 0)
                  ->orWhereNotNull('bug_tracker_link');
            });
        }

        if ($request->filled('search')) {
            $s = '%' . $request->input('search') . '%';
            $query->where(function ($q) use ($s) {
                $q->where('title', 'like', $s)
                  ->orWhere('sprint', 'like', $s)
                  ->orWhereHas('project', fn ($p) => $p->where('name', 'like', $s));
            });
        }

        // Summary KPI Metrics
        $totalHtmlBugs = (int) (clone $query)->sum('html_bugs');
        $totalFunctionalBugs = (int) (clone $query)->sum('functional_bugs');
        $totalBugs = (int) (clone $query)->sum('total_bugs');
        $tasksWithBugsCount = (clone $query)->where('total_bugs', '>', 0)->count();
        $totalTasksCount = (clone $query)->count();

        // Order by total bugs descending, then updated_at descending
        $query->orderByDesc('total_bugs')->orderByDesc('updated_at');

        $perPage = $request->input('per_page', 50);
        if ($perPage === 'all' || $request->boolean('all')) {
            $tasks = $query->get();
            $paginated = [
                'data' => $tasks,
                'total' => $tasks->count(),
                'current_page' => 1,
                'last_page' => 1,
            ];
        } else {
            $paginated = $query->paginate((int) $perPage);
        }

        return response()->json([
            'summary' => [
                'total_bugs' => $totalBugs,
                'html_bugs' => $totalHtmlBugs,
                'functional_bugs' => $totalFunctionalBugs,
                'tasks_with_bugs' => $tasksWithBugsCount,
                'total_tasks' => $totalTasksCount,
                'avg_bugs_per_task' => $totalTasksCount > 0 ? round($totalBugs / $totalTasksCount, 2) : 0,
            ],
            'tasks' => $paginated,
        ]);
    }
}
