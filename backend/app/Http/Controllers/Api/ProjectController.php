<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AddProjectMemberRequest;
use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Models\Project;
use App\Services\ProjectManagement\ProjectAuthorizationService;
use App\Services\ProjectManagement\ProjectService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ProjectController extends Controller
{
    public function __construct(
        private readonly ProjectAuthorizationService $auth,
        private readonly ProjectService $projects,
    ) {}

    /**
     * Scoped list: Employee sees projects they're a member of or
     * coordinate; Team Lead sees their own team's + coordinated;
     * Super Admin / `view all projects` holders see everything.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Project::query()->with(['team:id,name', 'coordinator:id,first_name,last_name']);

        $canViewAll = $user->hasRole('Super Admin')
            || $user->hasRole('Admin')
            || $user->hasRole('Team Lead')
            || $user->can('view all projects')
            || in_array(strtolower($user->role ?? ''), ['super admin', 'admin', 'team lead'], true);

        if (!$canViewAll) {
            $query->where(function ($q) use ($user) {
                $q->where('project_coordinator_id', $user->id)
                  ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('team_id')) {
            $teamId = (int) $request->input('team_id');
            $query->where(function ($q) use ($teamId) {
                $q->where('team_id', $teamId)
                  ->orWhereHas('members', fn ($m) => $m->where('users.team_id', $teamId))
                  ->orWhereHas('coordinator', fn ($c) => $c->where('users.team_id', $teamId));
            });
        }
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->string('search') . '%');
        }

        $perPage = $request->input('per_page', 20);
        $all = $request->boolean('all') || $perPage === 'all' || (int) $perPage === -1 || (int) $perPage === 0 || (int) $perPage > 500;

        if ($all) {
            $items = $query->select([
                'id',
                'name',
                'description',
                'category',
                'project_type',
                'team_id',
                'project_coordinator_id',
                'hubstaff_project_id',
                'status',
                'is_live',
                'live_date',
                'live_notes',
                'live_marked_by',
                'start_date',
                'expected_end_date',
                'created_at',
            ])->with([
                'team:id,name',
                'coordinator:id,first_name,last_name,email',
                'liveMarker:id,first_name,last_name',
            ])->withCount([
                'tasks',
                'tasks as completed_tasks_count' => fn ($q) => $q->where('status', 'Completed'),
                'tasks as active_tasks_count' => fn ($q) => $q->whereNotIn('status', ['Completed', 'Rejected', 'Forecast']),
            ])->orderBy('name', 'asc')->get();

            return response()->json([
                'data' => $items,
                'total' => $items->count(),
                'current_page' => 1,
                'last_page' => 1,
            ]);
        }

        return response()->json(
            $query->with([
                'team:id,name',
                'coordinator:id,first_name,last_name,email',
                'liveMarker:id,first_name,last_name',
            ])->withCount([
                'tasks',
                'tasks as completed_tasks_count' => fn ($q) => $q->where('status', 'Completed'),
                'tasks as active_tasks_count' => fn ($q) => $q->whereNotIn('status', ['Completed', 'Rejected', 'Forecast']),
            ])->orderBy('created_at', 'desc')->paginate((int) $perPage)
        );
    }

    public function store(StoreProjectRequest $request)
    {
        $user = $request->user();

        if (!$this->auth->canManageProject($user)) {
            return response()->json(['message' => 'Unauthorized to create projects.'], 403);
        }

        $data = $request->validated();

        // A Team Lead (non-Super-Admin) may only create projects owned by
        // their own team — defaults to it if not supplied, rejects any
        // attempt to set a different team via the request.
        if (!$user->hasRole('Super Admin')) {
            if (isset($data['team_id']) && $data['team_id'] !== $user->team_id) {
                return response()->json(['message' => 'You may only create projects for your own team.'], 403);
            }
            $data['team_id'] = $data['team_id'] ?? $user->team_id;
        }

        $project = $this->projects->createProject($data, $user, $request);

        return response()->json(['message' => 'Project created successfully.', 'data' => $project], 201);
    }

    public function show(Request $request, Project $project)
    {
        $user = $request->user();

        if (!$this->auth->canViewProject($user, $project)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $project->load(['team:id,name', 'coordinator:id,first_name,last_name,email', 'creator:id,first_name,last_name']);

        return response()->json(['data' => $project]);
    }

    public function update(UpdateProjectRequest $request, Project $project)
    {
        $user = $request->user();

        if (!$this->auth->canManageProject($user, $project)) {
            return response()->json(['message' => 'Unauthorized to edit this project.'], 403);
        }

        $project = $this->projects->updateProject($project, $request->validated(), $user, $request);

        return response()->json(['message' => 'Project updated successfully.', 'data' => $project]);
    }

    /** Archive (soft delete) — never a hard delete, preserves the PM audit trail. */
    public function destroy(Request $request, Project $project)
    {
        $user = $request->user();

        if (!$this->auth->canManageProject($user, $project)) {
            return response()->json(['message' => 'Unauthorized to archive this project.'], 403);
        }

        $this->projects->archiveProject($project, $user, $request);

        return response()->json(['message' => 'Project archived successfully.']);
    }

    public function members(Request $request, Project $project)
    {
        $user = $request->user();

        if (!$this->auth->canViewProject($user, $project)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        return response()->json([
            'data' => $project->members()->select('users.id', 'first_name', 'last_name', 'employee_code')->get(),
        ]);
    }

    public function addMember(AddProjectMemberRequest $request, Project $project)
    {
        $user = $request->user();

        if (!$this->auth->canManageProjectMembers($user, $project)) {
            return response()->json(['message' => 'Unauthorized to manage members of this project.'], 403);
        }

        $data = $request->validated();
        $member = $this->projects->addMember($project, (int) $data['user_id'], $data['project_role'] ?? 'Member', $user, $request);

        return response()->json(['message' => 'Member added successfully.', 'data' => $member], 201);
    }

    public function removeMember(Request $request, Project $project, int $userId)
    {
        $user = $request->user();

        if (!$this->auth->canManageProjectMembers($user, $project)) {
            return response()->json(['message' => 'Unauthorized to manage members of this project.'], 403);
        }

        $this->projects->removeMember($project, $userId, $user, $request);

        return response()->json(['message' => 'Member removed successfully.']);
    }

    /**
     * Assign or change the project's coordinator. Server-side department
     * eligibility check happens inside ProjectService::updateProject() /
     * assertCoordinatorEligible() — never trusted from the client, and
     * never implemented as a role or permission grant.
     */
    public function setCoordinator(Request $request, Project $project)
    {
        $user = $request->user();

        if (!$this->auth->canManageProject($user, $project)) {
            return response()->json(['message' => 'Unauthorized to set this project\'s coordinator.'], 403);
        }

        $request->validate([
            'project_coordinator_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $project = $this->projects->updateProject($project, [
            'project_coordinator_id' => $request->input('project_coordinator_id'),
        ], $user, $request);

        return response()->json(['message' => 'Project coordinator updated successfully.', 'data' => $project]);
    }

    /**
     * Mark a project as Made Live.
     * Completes project lifecycle while preserving post-launch/after-live task creation.
     */
    public function markAsLive(Request $request, Project $project)
    {
        $user = $request->user();

        if (!$this->auth->canManageProject($user, $project) && !$user->hasRole('Super Admin') && !$user->hasRole('Admin')) {
            return response()->json(['message' => 'Unauthorized to mark this project as Made Live.'], 403);
        }

        $request->validate([
            'live_date' => ['nullable', 'date'],
            'live_notes' => ['nullable', 'string'],
        ]);

        $project->is_live = true;
        $project->live_date = $request->input('live_date', now()->toDateString());
        $project->live_notes = $request->input('live_notes');
        $project->live_marked_by = $user->id;
        $project->status = 'Completed';
        $project->save();

        $project->load(['team:id,name', 'coordinator:id,first_name,last_name', 'liveMarker:id,first_name,last_name']);

        return response()->json([
            'message' => "Project '{$project->name}' marked as Made Live successfully.",
            'data' => $project,
        ]);
    }

    /**
     * Complete 360-degree status details of a project for the Project Status Drawer.
     */
    public function statusDetails(Request $request, Project $project)
    {
        $user = $request->user();

        if (!$this->auth->canViewProject($user, $project)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $project->load([
            'team:id,name',
            'coordinator:id,first_name,last_name,email,employee_code,designation',
            'creator:id,first_name,last_name',
            'liveMarker:id,first_name,last_name',
            'tasks' => fn($q) => $q->with([
                'subPhase:id,name',
                'assignees:id,first_name,last_name,employee_code,designation,team_id',
                'coordinator:id,first_name,last_name',
            ])->orderBy('due_date', 'asc'),
            'members:users.id,first_name,last_name,email,employee_code,designation,team_id',
        ]);

        // Hubstaff activity integration for this specific project
        $hubstaffProjectData = null;
        if (!empty($project->hubstaff_project_id)) {
            try {
                $hsService = app(\App\Services\HubstaffService::class);
                $hubstaffProjectId = (string) $project->hubstaff_project_id;
                $startDate = now()->subDays(60)->toDateString();
                $endDate = now()->toDateString();
                $hsAct = $hsService->getDailyActivities($startDate, $endDate, false);
                $rawActivities = $hsAct['activities'] ?? [];

                $projectTrackedSeconds = 0;
                $projectActivitySum = 0;
                $memberTracked = [];

                $userLinks = \App\Models\ProjectUserHubstaffLink::with('user:id,first_name,last_name,employee_code,designation')->get()->keyBy('hubstaff_user_id');

                foreach ($rawActivities as $act) {
                    if ((string) ($act['project_id'] ?? '') === $hubstaffProjectId) {
                        $sec = (int) ($act['tracked'] ?? $act['input_tracked'] ?? 0);
                        $rawAct = (float) ($act['activity'] ?? 0);
                        $actPct = $rawAct > 100 ? ($rawAct / 100) : ($rawAct <= 1 ? $rawAct * 100 : $rawAct);

                        $projectTrackedSeconds += $sec;
                        $projectActivitySum += ($actPct * $sec);

                        $hsUid = (string) ($act['user_id'] ?? '');
                        if (!isset($memberTracked[$hsUid])) {
                            $uLink = $userLinks->get($hsUid);
                            $memberTracked[$hsUid] = [
                                'hubstaff_user_id' => $hsUid,
                                'user_id' => $uLink?->user?->id,
                                'name' => $uLink?->user ? "{$uLink->user->first_name} {$uLink->user->last_name}" : "User #{$hsUid}",
                                'designation' => $uLink?->user?->designation ?? 'Member',
                                'tracked_seconds' => 0,
                                'activity_weighted_sum' => 0,
                            ];
                        }
                        $memberTracked[$hsUid]['tracked_seconds'] += $sec;
                        $memberTracked[$hsUid]['activity_weighted_sum'] += ($actPct * $sec);
                    }
                }

                $membersFormatted = [];
                foreach ($memberTracked as $m) {
                    $mSec = $m['tracked_seconds'];
                    $avgPct = $mSec > 0 ? (int) round($m['activity_weighted_sum'] / $mSec) : 0;
                    $fmt = floor($mSec / 3600) . 'h ' . str_pad((string) floor(($mSec % 3600) / 60), 2, '0', STR_PAD_LEFT) . 'm';
                    $membersFormatted[] = [
                        'hubstaff_user_id' => $m['hubstaff_user_id'],
                        'user_id' => $m['user_id'],
                        'name' => $m['name'],
                        'designation' => $m['designation'],
                        'tracked_seconds' => $mSec,
                        'tracked_formatted' => $fmt,
                        'activity_percentage' => $avgPct,
                    ];
                }
                usort($membersFormatted, fn($a, $b) => $b['tracked_seconds'] <=> $a['tracked_seconds']);

                $hubstaffProjectData = [
                    'hubstaff_project_id' => $hubstaffProjectId,
                    'total_tracked_seconds' => $projectTrackedSeconds,
                    'total_tracked_formatted' => floor($projectTrackedSeconds / 3600) . 'h ' . str_pad((string) floor(($projectTrackedSeconds % 3600) / 60), 2, '0', STR_PAD_LEFT) . 'm',
                    'avg_activity_percentage' => $projectTrackedSeconds > 0 ? (int) round($projectActivitySum / $projectTrackedSeconds) : 0,
                    'members' => $membersFormatted,
                ];
            } catch (\Throwable $e) {
                // Non-blocking Hubstaff fallback
            }
        }

        // Subphase analytics
        $subPhasesList = \App\Models\ProjectSubPhase::availableForTeam($project->team_id)
            ->orderBy('display_order', 'asc')
            ->get();

        $taskSubPhaseIds = $project->tasks->pluck('sub_phase_id')->filter()->unique();
        $missingIds = $taskSubPhaseIds->diff($subPhasesList->pluck('id'));
        if ($missingIds->isNotEmpty()) {
            $extraSubPhases = \App\Models\ProjectSubPhase::whereIn('id', $missingIds)->orderBy('display_order', 'asc')->get();
            $subPhasesList = $subPhasesList->concat($extraSubPhases);
        }

        $subPhasesAnalytics = [];
        foreach ($subPhasesList as $sp) {
            $phaseTasks = $project->tasks->where('sub_phase_id', $sp->id);
            $total = $phaseTasks->count();
            $completed = $phaseTasks->where('status', 'Completed')->count();
            $inProgress = $phaseTasks->whereIn('status', ['In Progress', 'Being Developed', 'Ready for QA', 'Assigned to QA'])->count();
            $forecast = $phaseTasks->where('status', 'Forecast')->count();

            if ($total > 0 || $sp->team_id === $project->team_id) {
                $subPhasesAnalytics[] = [
                    'id' => $sp->id,
                    'name' => $sp->name,
                    'order' => $sp->display_order,
                    'status' => $total > 0 && $completed === $total ? 'Completed' : ($inProgress > 0 ? 'In Progress' : 'Pending'),
                    'total_tasks' => $total,
                    'completed_tasks' => $completed,
                    'in_progress_tasks' => $inProgress,
                    'forecast_tasks' => $forecast,
                    'progress_percentage' => $total > 0 ? (int) round(($completed / $total) * 100) : 0,
                ];
            }
        }

        // Tasks with deviations & after-live tasks
        $deviations = [];
        $afterLiveTasks = [];
        $liveDate = $project->live_date ? \Carbon\Carbon::parse($project->live_date)->startOfDay() : null;

        foreach ($project->tasks as $t) {
            if ($t->deviation && abs((float) $t->deviation) > 0) {
                $deviations[] = [
                    'id' => $t->id,
                    'title' => $t->title,
                    'status' => $t->status,
                    'allotted_days' => $t->allotted_days,
                    'time_taken' => $t->time_taken,
                    'days_taken' => $t->days_taken,
                    'deviation' => $t->deviation,
                    'deviation_reason' => $t->deviation_reason,
                    'sub_phase_name' => $t->subPhase?->name ?? 'General',
                ];
            }

            if ($liveDate && $t->created_at && \Carbon\Carbon::parse($t->created_at)->gte($liveDate)) {
                $afterLiveTasks[] = $t;
            }
        }

        return response()->json([
            'data' => [
                'project' => $project,
                'sub_phases_analytics' => $subPhasesAnalytics,
                'hubstaff_analytics' => $hubstaffProjectData,
                'deviations' => $deviations,
                'after_live_tasks' => $afterLiveTasks,
                'stats' => [
                    'total_tasks' => $project->tasks->count(),
                    'completed_tasks' => $project->tasks->where('status', 'Completed')->count(),
                    'active_tasks' => $project->tasks->whereNotIn('status', ['Completed', 'Rejected', 'Forecast'])->count(),
                    'forecast_tasks' => $project->tasks->where('status', 'Forecast')->count(),
                    'overdue_tasks' => $project->tasks->filter(fn($t) => $t->due_date && $t->due_date < now()->toDateString() && !in_array($t->status, ['Completed', 'Rejected']))->count(),
                    'total_members' => $project->members->count(),
                ]
            ]
        ]);
    }
}
