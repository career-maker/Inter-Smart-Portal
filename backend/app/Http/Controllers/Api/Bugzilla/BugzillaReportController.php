<?php

namespace App\Http\Controllers\Api\Bugzilla;

use App\Http\Controllers\Controller;
use App\Models\BugzillaBug;
use App\Models\BugzillaHistory;
use App\Models\BugzillaProject;
use App\Services\BugzillaAuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BugzillaReportController extends Controller
{
    /**
     * Dashboard Overview Metrics & Charts.
     */
    public function overview(Request $request)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canView($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $baseQuery = BugzillaBug::query();

        // Team isolation if not super admin
        if (!BugzillaAuthService::isSuperAdmin($user) && !\App\Models\CustomTeamPermission::userHasPermission($user, 'task_cross_team_view')) {
            $userTeamIds = BugzillaAuthService::resolveUserTeamIds($user);
            $baseQuery->whereHas('portalProject', function ($q) use ($userTeamIds) {
                $q->whereIn('team_id', $userTeamIds);
            });
        }

        if ($request->filled('project_id') && $request->query('project_id') !== 'all') {
            $baseQuery->where('bugzilla_project_id', $request->query('project_id'));
        }

        // Summary metric counts
        $totalBugs = (clone $baseQuery)->count();
        $openBugs = (clone $baseQuery)->whereNotIn('status', ['RESOLVED', 'CLOSED'])->count();
        $criticalBugs = (clone $baseQuery)->whereIn('severity', ['BLOCKER', 'CRITICAL'])->whereNotIn('status', ['RESOLVED', 'CLOSED'])->count();
        $unassignedBugs = (clone $baseQuery)->whereNull('assignee_id')->whereNotIn('status', ['RESOLVED', 'CLOSED'])->count();
        $resolvedBugs = (clone $baseQuery)->where('status', 'RESOLVED')->count();
        $closedBugs = (clone $baseQuery)->where('status', 'CLOSED')->count();
        $reopenedBugs = (clone $baseQuery)->where('status', 'REOPENED')->count();
        $assignedToMe = (clone $baseQuery)->where('assignee_id', $user->id)->whereNotIn('status', ['RESOLVED', 'CLOSED'])->count();

        // Status breakdown
        $statusBreakdown = (clone $baseQuery)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        // Severity breakdown
        $severityBreakdown = (clone $baseQuery)
            ->select('severity', DB::raw('count(*) as count'))
            ->groupBy('severity')
            ->pluck('count', 'severity')
            ->toArray();

        // Priority breakdown
        $priorityBreakdown = (clone $baseQuery)
            ->select('priority', DB::raw('count(*) as count'))
            ->groupBy('priority')
            ->pluck('count', 'priority')
            ->toArray();

        // Recent activity
        $recentActivity = BugzillaHistory::with([
            'bug:id,bug_number,summary,status,severity,priority',
            'user:id,first_name,last_name',
        ])
        ->whereHas('bug', function ($q) use ($baseQuery) {
            // Apply same project / scope filters
            $q->mergeConstraintsFrom($baseQuery);
        })
        ->orderBy('created_at', 'desc')
        ->limit(10)
        ->get();

        return response()->json([
            'metrics' => [
                'total' => $totalBugs,
                'open' => $openBugs,
                'critical' => $criticalBugs,
                'unassigned' => $unassignedBugs,
                'resolved' => $resolvedBugs,
                'closed' => $closedBugs,
                'reopened' => $reopenedBugs,
                'assigned_to_me' => $assignedToMe,
            ],
            'status_distribution' => $statusBreakdown,
            'severity_distribution' => $severityBreakdown,
            'priority_distribution' => $priorityBreakdown,
            'recent_activity' => $recentActivity,
            'capabilities' => BugzillaAuthService::getCapabilitiesPayload($user),
        ]);
    }

    /**
     * Detailed Reports & Breakdown.
     */
    public function reports(Request $request)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canView($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $baseQuery = BugzillaBug::query();

        if (!BugzillaAuthService::isSuperAdmin($user) && !\App\Models\CustomTeamPermission::userHasPermission($user, 'task_cross_team_view')) {
            $userTeamIds = BugzillaAuthService::resolveUserTeamIds($user);
            $baseQuery->whereHas('portalProject', function ($q) use ($userTeamIds) {
                $q->whereIn('team_id', $userTeamIds);
            });
        }

        // Breakdown by project
        $byProject = (clone $baseQuery)
            ->join('bugzilla_projects', 'bugzilla_bugs.bugzilla_project_id', '=', 'bugzilla_projects.id')
            ->select(
                'bugzilla_projects.id',
                'bugzilla_projects.name',
                DB::raw('count(*) as total'),
                DB::raw("count(case when bugzilla_bugs.status not in ('RESOLVED', 'CLOSED') then 1 end) as open_count"),
                DB::raw("count(case when bugzilla_bugs.status = 'RESOLVED' then 1 end) as resolved_count"),
                DB::raw("count(case when bugzilla_bugs.severity in ('BLOCKER', 'CRITICAL') and bugzilla_bugs.status not in ('RESOLVED', 'CLOSED') then 1 end) as critical_count")
            )
            ->groupBy('bugzilla_projects.id', 'bugzilla_projects.name')
            ->orderByDesc('total')
            ->limit(15)
            ->get();

        // Breakdown by component
        $byComponent = (clone $baseQuery)
            ->leftJoin('bugzilla_components', 'bugzilla_bugs.component_id', '=', 'bugzilla_components.id')
            ->select(
                DB::raw("coalesce(bugzilla_components.name, 'Uncategorized') as component_name"),
                DB::raw('count(*) as total'),
                DB::raw("count(case when bugzilla_bugs.status not in ('RESOLVED', 'CLOSED') then 1 end) as open_count")
            )
            ->groupBy('component_name')
            ->orderByDesc('total')
            ->limit(15)
            ->get();

        // Breakdown by assignee
        $byAssignee = (clone $baseQuery)
            ->leftJoin('users', 'bugzilla_bugs.assignee_id', '=', 'users.id')
            ->select(
                DB::raw("coalesce(concat(users.first_name, ' ', users.last_name), 'Unassigned') as assignee_name"),
                DB::raw('count(*) as total'),
                DB::raw("count(case when bugzilla_bugs.status not in ('RESOLVED', 'CLOSED') then 1 end) as open_count")
            )
            ->groupBy('assignee_name')
            ->orderByDesc('total')
            ->limit(15)
            ->get();

        return response()->json([
            'by_project' => $byProject,
            'by_component' => $byComponent,
            'by_assignee' => $byAssignee,
        ]);
    }
}
