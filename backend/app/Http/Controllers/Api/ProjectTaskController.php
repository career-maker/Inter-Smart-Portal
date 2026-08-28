<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AssignProjectTaskRequest;
use App\Http\Requests\StoreProjectTaskRequest;
use App\Http\Requests\UpdateProjectTaskRequest;
use App\Http\Requests\UpdateProjectTaskStatusRequest;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\Team;
use App\Models\User;
use App\Models\Attendance;
use App\Services\ProjectManagement\ProjectAuthorizationService;
use App\Services\ProjectManagement\ProjectTaskService;
use Illuminate\Http\Request;

class ProjectTaskController extends Controller
{
    public function __construct(
        private readonly ProjectAuthorizationService $auth,
        private readonly ProjectTaskService $tasks,
    ) {}

    private function autoSplitMultiAssigneeTasks(): void
    {
        try {
            $multiAssigneeTasks = ProjectTask::has('taskAssignees', '>', 1)->with('taskAssignees')->get();
            foreach ($multiAssigneeTasks as $legacyTask) {
                $assignees = $legacyTask->taskAssignees->sortBy('id')->values();
                for ($i = 1; $i < count($assignees); $i++) {
                    $assigneeRow = $assignees[$i];
                    $newTask = $legacyTask->replicate();
                    $newTask->save();
                    $assigneeRow->task_id = $newTask->id;
                    $assigneeRow->is_primary = true;
                    $assigneeRow->save();
                }
            }
        } catch (\Throwable $e) {
            // Non-blocking fallback
        }
    }

    public function index(Request $request)
    {
        $this->autoSplitMultiAssigneeTasks();

        $user = $request->user();
        $query = ProjectTask::query()->with([
            'project:id,name,project_type,category,project_coordinator_id,team_id',
            'project.coordinator:id,first_name,last_name',
            'coordinator:id,first_name,last_name',
            'subPhase:id,name',
            'catalogTask:id,name,category',
            'assignees:id,first_name,last_name,team_id',
            'team:id,name',
            'comments' => fn ($q) => $q->latest()->limit(1),
        ])->withCount(['comments', 'bugs']);

        $canViewAll = $user->hasRole('Super Admin')
            || $user->hasRole('Admin')
            || $user->hasRole('Team Lead')
            || $user->can('view all projects')
            || in_array(strtolower($user->role ?? ''), ['super admin', 'admin', 'team lead'], true);

        if (!$canViewAll) {
            $query->where(function ($q) use ($user) {
                $q->whereHas('project', function ($p) use ($user) {
                    $p->where('project_coordinator_id', $user->id)
                      ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
                })
                ->orWhere('coordinator_id', $user->id)
                ->orWhereHas('assignees', fn ($a) => $a->where('users.id', $user->id));
            });
        }

        foreach (['project_id', 'sub_phase_id'] as $filter) {
            if ($request->filled($filter)) {
                $query->where($filter, (int) $request->input($filter));
            }
        }

        if ($request->filled('team_id')) {
            $teamId = (int) $request->input('team_id');
            $query->where(function ($q) use ($teamId) {
                $q->where('team_id', $teamId)
                  ->orWhereHas('project', fn ($p) => $p->where('team_id', $teamId))
                  ->orWhereHas('assignees', fn ($a) => $a->where('users.team_id', $teamId));
            });
        }
        if ($request->filled('status')) {
            $statusVal = $request->string('status');
            if (strtolower($statusVal) === 'active') {
                $query->whereIn('status', ['In Progress', 'Being Developed', 'Ready for QA', 'Assigned to QA', 'Yet to Start', 'On Hold']);
            } elseif (strtolower($statusVal) === 'overdue') {
                $query->whereNotNull('due_date')
                      ->where('due_date', '<', now()->toDateString())
                      ->whereNotIn('status', ['Completed', 'Rejected']);
            } else {
                $query->where('status', $statusVal);
            }
        }
        if ($request->filled('assignee_id')) {
            $assigneeId = (int) $request->input('assignee_id');
            $query->whereHas('taskAssignees', fn ($a) => $a->where('user_id', $assigneeId));
        }
        if ($request->filled('coordinator_id')) {
            $coordId = (int) $request->input('coordinator_id');
            $query->where(function ($q) use ($coordId) {
                $q->where('coordinator_id', $coordId)
                  ->orWhere(function ($sq) use ($coordId) {
                      $sq->whereNull('coordinator_id')
                         ->whereHas('project', fn ($p) => $p->where('project_coordinator_id', $coordId));
                  });
            });
        }
        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhereHas('project', fn ($p) => $p->where('name', 'like', "%{$search}%"))
                  ->orWhereHas('assignees', function ($a) use ($search) {
                      $a->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%");
                  });
            });
        }

        $perPage = $request->input('per_page', 20);
        if ($perPage === 'all' || (int) $perPage === -1) {
            $items = $query->orderBy('due_date')->get();
            return response()->json([
                'data' => $items,
                'total' => $items->count(),
                'current_page' => 1,
                'last_page' => 1,
            ]);
        }

        return response()->json($query->orderBy('due_date')->paginate((int) $perPage));
    }

    public function my(Request $request)
    {
        $this->autoSplitMultiAssigneeTasks();

        $user = $request->user();

        $query = ProjectTask::query()
            ->whereHas('taskAssignees', fn ($a) => $a->where('user_id', $user->id))
            ->with([
                'project:id,name,project_type,category,project_coordinator_id',
                'project.coordinator:id,first_name,last_name',
                'coordinator:id,first_name,last_name',
                'subPhase:id,name',
                'catalogTask:id,name,category',
                'assignees:id,first_name,last_name',
                'team:id,name',
                'comments' => fn ($q) => $q->latest()->limit(1),
            ])
            ->withCount(['comments', 'bugs'])
            ->orderBy('due_date');

        if ($request->filled('status')) {
            $statusVal = $request->string('status');
            if (strtolower($statusVal) === 'active') {
                $query->whereIn('status', ['In Progress', 'Being Developed', 'Ready for QA', 'Assigned to QA', 'Yet to Start', 'On Hold']);
            } elseif (strtolower($statusVal) === 'overdue') {
                $query->whereNotNull('due_date')
                      ->where('due_date', '<', now()->toDateString())
                      ->whereNotIn('status', ['Completed', 'Rejected']);
            } else {
                $query->where('status', $statusVal);
            }
        }
        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhereHas('project', fn ($p) => $p->where('name', 'like', "%{$search}%"));
            });
        }

        $perPage = $request->input('per_page', 20);
        if ($perPage === 'all' || (int) $perPage === -1) {
            $items = $query->get();
            return response()->json([
                'data' => $items,
                'total' => $items->count(),
                'current_page' => 1,
                'last_page' => 1,
            ]);
        }

        return response()->json($query->paginate((int) $perPage));
    }

    public function store(StoreProjectTaskRequest $request, Project $project)
    {
        $user = $request->user();
        $user->loadMissing('roles', 'team');

        if (!$this->auth->canCreateTask($user, $project)) {
            return response()->json(['message' => 'Unauthorized to create tasks for this project.'], 403);
        }

        $data = $request->validated();
        $assigneeIds = $data['assignee_ids'] ?? [];
        unset($data['assignee_ids']);

        $userRolesStr = strtolower($user->roles->pluck('name')->implode(' '));
        $isTeamLead = $user->hasRole('Team Lead')
            || str_contains($userRolesStr, 'lead')
            || strtolower($user->role ?? '') === 'team lead'
            || \App\Models\Team::where('team_lead_id', $user->id)->exists();

        $isSuperAdmin = $user->hasRole('Super Admin')
            || str_contains($userRolesStr, 'super admin')
            || str_contains($userRolesStr, 'admin')
            || strtolower($user->role ?? '') === 'super admin'
            || strtolower($user->role ?? '') === 'admin';

        // Resolve effective team ID for the task
        $effectiveTeamId = $user->team_id;
        if (!$effectiveTeamId && $isTeamLead) {
            $effectiveTeamId = \App\Models\Team::where('team_lead_id', $user->id)->value('id');
        }
        if (!$effectiveTeamId) {
            $effectiveTeamId = $project->team_id;
        }

        if ($isTeamLead && !$isSuperAdmin) {
            $data['team_id'] = $effectiveTeamId;

            if (!empty($assigneeIds) && $effectiveTeamId) {
                $invalidCount = \App\Models\User::whereIn('id', $assigneeIds)
                    ->where('id', '!=', $user->id)
                    ->where(function ($q) use ($effectiveTeamId) {
                        $q->whereNull('team_id')
                          ->orWhere('team_id', '!=', $effectiveTeamId);
                    })
                    ->count();

                if ($invalidCount > 0) {
                    return response()->json(['message' => 'Team Leads may only assign tasks to members of their own HR team.'], 403);
                }
            }
        }

        if (!empty($assigneeIds) && count($assigneeIds) > 1) {
            $createdTasks = [];
            foreach ($assigneeIds as $assigneeId) {
                $individualTask = $this->tasks->createTask($project, $data, $user, $request);
                $this->tasks->assignUser($individualTask, (int) $assigneeId, $user, true, $request);
                $createdTasks[] = $individualTask;
            }

            return response()->json([
                'message' => 'Tasks created individually for each assigned employee.',
                'data' => $createdTasks[0]->load(['assignees', 'catalogTask']),
                'tasks' => $createdTasks,
            ], 201);
        }

        $task = $this->tasks->createTask($project, $data, $user, $request);

        if (!empty($assigneeIds)) {
            foreach ($assigneeIds as $index => $assigneeId) {
                $this->tasks->assignUser($task, (int) $assigneeId, $user, $index === 0, $request);
            }
        }

        return response()->json(['message' => 'Task created successfully.', 'data' => $task->load(['assignees', 'catalogTask'])], 201);
    }

    public function show(Request $request, ProjectTask $task)
    {
        $user = $request->user();

        if (!$this->auth->canViewTask($user, $task)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $task->load(['project:id,name,team_id', 'subPhase:id,name', 'catalogTask:id,name,category', 'coordinator:id,first_name,last_name', 'assignees:id,first_name,last_name']);

        return response()->json(['data' => $task]);
    }

    /**
     * Splits the validated payload into planning vs. execution fields
     * (Decision 2) and only applies what THIS caller is actually
     * authorized to change — never trusts the client to only submit
     * fields it's allowed to touch.
     */
    public function update(UpdateProjectTaskRequest $request, ProjectTask $task)
    {
        $user = $request->user();
        $canManage = $this->auth->canManageTask($user, $task);
        $canExecute = $this->auth->canUpdateTaskExecution($user, $task);

        if (!$canManage && !$canExecute) {
            return response()->json(['message' => 'Unauthorized to edit this task.'], 403);
        }

        $validated = $request->validated();
        $allowedFields = $canManage
            ? array_merge(ProjectTask::PLANNING_FIELDS, ProjectTask::EXECUTION_FIELDS)
            : ProjectTask::EXECUTION_FIELDS;

        $data = array_intersect_key($validated, array_flip($allowedFields));

        if (empty($data)) {
            return response()->json(['message' => 'No permitted fields were submitted for update.'], 422);
        }

        $task = $this->tasks->updateTask($task, $data, $user, $request);

        return response()->json(['message' => 'Task updated successfully.', 'data' => $task->load('catalogTask')]);
    }

    public function updateStatus(UpdateProjectTaskStatusRequest $request, ProjectTask $task)
    {
        $user = $request->user();

        if (!$this->auth->canUpdateTaskExecution($user, $task)) {
            return response()->json(['message' => 'Unauthorized to update this task\'s status.'], 403);
        }

        $task = $this->tasks->updateTask($task, $request->validated(), $user, $request);

        return response()->json(['message' => 'Task status updated successfully.', 'data' => $task]);
    }

    public function addAssignee(AssignProjectTaskRequest $request, ProjectTask $task)
    {
        $user = $request->user();

        if (!$this->auth->canManageTask($user, $task)) {
            return response()->json(['message' => 'Unauthorized to assign this task.'], 403);
        }

        $data = $request->validated();
        $targetUser = \App\Models\User::find((int) $data['user_id']);

        if (!$targetUser) {
            return response()->json(['message' => 'Target user not found.'], 404);
        }

        if (!$this->auth->canAssignUserToTask($user, $task, $targetUser)) {
            return response()->json(['message' => 'Team Leads may only assign tasks to members of their own HR team.'], 403);
        }

        $assignee = $this->tasks->assignUser($task, (int) $data['user_id'], $user, (bool) ($data['is_primary'] ?? false), $request);

        return response()->json(['message' => 'Assignee added successfully.', 'data' => $assignee], 201);
    }

    public function removeAssignee(Request $request, ProjectTask $task, int $userId)
    {
        $user = $request->user();

        if (!$this->auth->canManageTask($user, $task)) {
            return response()->json(['message' => 'Unauthorized to unassign this task.'], 403);
        }

        $this->tasks->unassignUser($task, $userId, $user, $request);

        return response()->json(['message' => 'Assignee removed successfully.']);
    }

    /**
     * Task-level coordinator override. Eligibility (Project Coordinators
     * department membership) is enforced server-side in the service —
     * never trusted from the client, never a role/permission grant.
     */
    public function setCoordinator(Request $request, ProjectTask $task)
    {
        $user = $request->user();

        if (!$this->auth->canManageTask($user, $task)) {
            return response()->json(['message' => 'Unauthorized to set this task\'s coordinator.'], 403);
        }

        $request->validate([
            'coordinator_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $task = $this->tasks->setCoordinator($task, $request->input('coordinator_id'), $user, $request);

        return response()->json(['message' => 'Task coordinator updated successfully.', 'data' => $task]);
    }
    /**
     * Dedicated lightweight endpoint to fetch assignable team members.
     * Team Lead: Returns only their team members instantly.
     * Super Admin / Admin: Returns all organization employees.
     */
    /**
     * Dedicated lightweight endpoint to fetch assignable team members.
     * Team Lead: Returns only their team members instantly.
     * Super Admin / Admin: Returns all organization employees.
     */
    public function getTeamMembers(Request $request)
    {
        $user = $request->user();
        $user->loadMissing('roles', 'team');

        $userRolesStr = strtolower($user->roles->pluck('name')->implode(' '));
        $isExplicitTeamLead = str_contains($userRolesStr, 'lead')
            || \App\Models\Team::where('team_lead_id', $user->id)->exists();

        // Resolve Team ID
        $teamId = $user->team_id;
        $team = $user->team;

        if (!$teamId) {
            $ledTeam = \App\Models\Team::where('team_lead_id', $user->id)->first();
            if ($ledTeam) {
                $teamId = $ledTeam->id;
                $team = $ledTeam;
            }
        }

        // If the user is a Team Lead or has an assigned team and is NOT pure Super Admin:
        if ($isExplicitTeamLead || ($teamId && !str_contains($userRolesStr, 'super admin'))) {
            if ($teamId) {
                $members = \App\Models\User::where('status', 'Active')
                    ->where(function ($q) use ($teamId, $user) {
                        $q->where('team_id', $teamId)
                          ->orWhere('id', $user->id);
                    })
                    ->select(['id', 'first_name', 'last_name', 'employee_code', 'designation', 'team_id'])
                    ->with('team:id,name')
                    ->orderBy('first_name')
                    ->get()
                    ->map(fn($u) => [
                        'id' => $u->id,
                        'first_name' => $u->first_name,
                        'last_name' => $u->last_name,
                        'employee_code' => $u->employee_code,
                        'designation' => $u->designation,
                        'team_id' => $u->team_id,
                        'department' => $u->team?->name ?? $team?->name ?? 'My Team',
                    ]);

                return response()->json([
                    'is_super_admin' => false,
                    'team_id' => $teamId,
                    'team_name' => $team?->name ?? 'My Team',
                    'members' => $members,
                    'total' => $members->count(),
                ]);
            }
        }

        // Super Admin check
        $isSuperAdmin = $user->hasRole('Super Admin')
            || str_contains($userRolesStr, 'super admin')
            || str_contains($userRolesStr, 'admin');

        if ($isSuperAdmin) {
            $members = \App\Models\User::where('status', 'Active')
                ->select(['id', 'first_name', 'last_name', 'employee_code', 'designation', 'team_id'])
                ->with('team:id,name')
                ->orderBy('first_name')
                ->get()
                ->map(fn($u) => [
                    'id' => $u->id,
                    'first_name' => $u->first_name,
                    'last_name' => $u->last_name,
                    'employee_code' => $u->employee_code,
                    'designation' => $u->designation,
                    'team_id' => $u->team_id,
                    'department' => $u->team?->name ?? 'General',
                ]);

            return response()->json([
                'is_super_admin' => true,
                'team_name' => 'All Organization Members',
                'members' => $members,
                'total' => $members->count(),
            ]);
        }

        // Fallback for regular employees: their team or themselves
        $query = \App\Models\User::where('status', 'Active');
        if ($teamId) {
            $query->where(function ($q) use ($teamId, $user) {
                $q->where('team_id', $teamId)
                  ->orWhere('id', $user->id);
            });
        } else {
            $query->where('id', $user->id);
        }

        $members = $query->select(['id', 'first_name', 'last_name', 'employee_code', 'designation', 'team_id'])
            ->with('team:id,name')
            ->orderBy('first_name')
            ->get()
            ->map(fn($u) => [
                'id' => $u->id,
                'first_name' => $u->first_name,
                'last_name' => $u->last_name,
                'employee_code' => $u->employee_code,
                'designation' => $u->designation,
                'team_id' => $u->team_id,
                'department' => $u->team?->name ?? 'My Team',
            ]);

        return response()->json([
            'is_super_admin' => false,
            'team_id' => $teamId,
            'team_name' => $team?->name ?? 'My Team',
            'members' => $members,
            'total' => $members->count(),
        ]);
    }

    public function dailyReport(Request $request)
    {
        $this->autoSplitMultiAssigneeTasks();

        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin') || in_array(strtolower($user->role ?? ''), ['super admin'], true);
        $isAdmin = $user->hasRole('Admin') || in_array(strtolower($user->role ?? ''), ['admin'], true);
        $isTeamLead = $user->hasRole('Team Lead')
            || in_array(strtolower($user->role ?? ''), ['team lead'], true)
            || Team::where('team_lead_id', $user->id)->exists();
        $isEmployee = !$isSuperAdmin && !$isAdmin && !$isTeamLead;

        $date = $request->input('date') ?: now()->toDateString();
        $requestedType = $request->input('report_type') ?: ($isEmployee ? 'my_daily' : 'full_team_daily');

        // Enforce role-based allowed types
        if ($isEmployee) {
            $reportType = in_array($requestedType, ['my_daily', 'my_tomorrow'], true) ? $requestedType : 'my_daily';
        } else {
            $allowedTypes = ['full_team_daily', 'individual_member', 'my_daily', 'tomorrow_team', 'my_tomorrow', 'full_tracker'];
            $reportType = in_array($requestedType, $allowedTypes, true) ? $requestedType : 'full_team_daily';
        }

        $targetDate = in_array($reportType, ['my_tomorrow', 'tomorrow_team'], true)
            ? \Carbon\Carbon::parse($date)->addDay()->toDateString()
            : $date;

        // Resolve Target Scope & Members
        $members = collect();
        $selectedTeam = null;

        if ($isEmployee || $reportType === 'my_daily' || $reportType === 'my_tomorrow') {
            $members = collect([$user]);
            if ($user->team_id) {
                $selectedTeam = Team::find($user->team_id);
            }
        } elseif ($reportType === 'individual_member') {
            $targetUserId = (int) $request->input('user_id');
            if ($isTeamLead && !$isSuperAdmin && !$isAdmin) {
                $ledTeamIds = Team::where('team_lead_id', $user->id)->pluck('id')->toArray();
                if ($user->team_id) {
                    $ledTeamIds[] = $user->team_id;
                }
                $targetUser = null;
                if ($targetUserId > 0) {
                    $targetUser = User::whereIn('team_id', array_unique($ledTeamIds))->find($targetUserId);
                }
                if (!$targetUser) {
                    // Fallback to first active member of led team or self
                    $targetUser = User::whereIn('team_id', array_unique($ledTeamIds))->where('status', 'Active')->first() ?: $user;
                }
                $members = collect([$targetUser]);
                $selectedTeam = $targetUser->team_id ? Team::find($targetUser->team_id) : ($user->team_id ? Team::find($user->team_id) : null);
            } else {
                $targetUser = ($targetUserId > 0 ? User::find($targetUserId) : null) ?: $user;
                $members = collect([$targetUser]);
                if ($targetUser->team_id) {
                    $selectedTeam = Team::find($targetUser->team_id);
                }
            }
        } else {
            // Team level report: full_team_daily, tomorrow_team, full_tracker
            $teamId = (int) $request->input('team_id');
            if ($isTeamLead && !$isSuperAdmin && !$isAdmin) {
                $ledTeams = Team::where('team_lead_id', $user->id)->get();
                $ledTeamIds = $ledTeams->pluck('id')->toArray();
                if ($user->team_id && !in_array($user->team_id, $ledTeamIds)) {
                    $ledTeamIds[] = $user->team_id;
                }

                if ($teamId && in_array($teamId, $ledTeamIds, true)) {
                    $selectedTeam = Team::find($teamId);
                } else {
                    $selectedTeam = $ledTeams->first() ?: ($user->team_id ? Team::find($user->team_id) : null);
                }
            } else {
                // Admin / Super Admin
                if ($teamId) {
                    $selectedTeam = Team::find($teamId);
                } else {
                    $selectedTeam = Team::first();
                }
            }

            if ($selectedTeam) {
                $members = User::where('team_id', $selectedTeam->id)->where('status', 'Active')->orderBy('first_name')->get();
                if ($members->isEmpty()) {
                    $members = User::where('team_id', $selectedTeam->id)->orderBy('first_name')->get();
                }
            } else {
                $members = collect([$user]);
            }
        }

        $memberIds = $members->pluck('id')->toArray();

        // Query Tasks
        $taskQuery = ProjectTask::query()
            ->with([
                'project:id,name,project_type,category',
                'subPhase:id,name',
                'assignees:id,first_name,last_name,email,profile_photo_path',
                'coordinator:id,first_name,last_name',
            ])
            ->whereHas('taskAssignees', function ($q) use ($memberIds) {
                $q->whereIn('user_id', $memberIds);
            });

        if ($reportType !== 'full_tracker') {
            $taskQuery->where(function ($q) use ($targetDate) {
                $q->whereDate('due_date', $targetDate)
                  ->orWhere(function ($activeQ) use ($targetDate) {
                      $activeQ->where('start_date', '<=', $targetDate)
                              ->whereNotIn('status', ['Completed', 'Rejected']);
                  })
                  ->orWhere(function ($compQ) use ($targetDate) {
                      $compQ->where('status', 'Completed')
                            ->where(function ($d) use ($targetDate) {
                                $d->whereDate('actual_completion_date', $targetDate)
                                  ->orWhereDate('updated_at', $targetDate);
                            });
                  });
            });
        }

        $tasks = $taskQuery->get();

        // Calculate IST Overdue & Metrics
        $nowIst = now()->setTimezone('Asia/Kolkata');
        $todayIstStr = $nowIst->toDateString();
        $isPast630Pm = $nowIst->hour > 18 || ($nowIst->hour === 18 && $nowIst->minute >= 30);

        $completedCount = 0;
        $inProgressCount = 0;
        $pendingCount = 0;
        $onHoldCount = 0;
        $overdueCount = 0;

        $tasksData = $tasks->map(function ($task) use ($targetDate, $todayIstStr, $isPast630Pm, &$completedCount, &$inProgressCount, &$pendingCount, &$onHoldCount, &$overdueCount) {
            $isCompleted = $task->status === 'Completed';
            $isRejected = $task->status === 'Rejected';
            $isOverdue = false;
            $delayDays = 0;

            if (!$isCompleted && !$isRejected && $task->due_date) {
                $dueStr = \Carbon\Carbon::parse($task->due_date)->toDateString();
                if ($dueStr < $todayIstStr) {
                    $isOverdue = true;
                    $delayDays = \Carbon\Carbon::parse($dueStr)->diffInDays(\Carbon\Carbon::parse($todayIstStr));
                } elseif ($dueStr === $todayIstStr && $isPast630Pm) {
                    $isOverdue = true;
                    $delayDays = 1;
                }
            }

            if ($isCompleted) {
                $completedCount++;
            } elseif ($task->status === 'Yet to Start') {
                $pendingCount++;
            } elseif ($task->status === 'On Hold') {
                $onHoldCount++;
            } else {
                $inProgressCount++;
            }

            if ($isOverdue) {
                $overdueCount++;
            }

            $primaryAssignee = $task->assignees->first();

            return [
                'id' => $task->id,
                'title' => $task->title,
                'status' => $task->status,
                'priority' => $task->priority,
                'start_date' => $task->start_date,
                'due_date' => $task->due_date,
                'actual_completion_date' => $task->actual_completion_date,
                'current_updates' => $task->current_updates,
                'description' => $task->description,
                'deviation' => $task->deviation,
                'is_overdue' => $isOverdue,
                'delay_days' => $delayDays,
                'project_name' => $task->project?->name ?? 'General / Internal',
                'sub_phase_name' => $task->subPhase?->name,
                'assignee_id' => $primaryAssignee?->id,
                'assignee_name' => $primaryAssignee ? trim("{$primaryAssignee->first_name} {$primaryAssignee->last_name}") : 'Unassigned',
                'assignee_avatar' => $primaryAssignee?->profilePhotoUrl(),
            ];
        });

        // Group tasks by member
        $memberReports = $members->map(function ($m) use ($tasksData) {
            $memberTasks = $tasksData->where('assignee_id', $m->id)->values();
            return [
                'user_id' => $m->id,
                'name' => trim("{$m->first_name} {$m->last_name}"),
                'designation' => $m->designation ?? $m->role ?? 'Team Member',
                'employee_code' => $m->employee_code,
                'avatar' => $m->profilePhotoUrl(),
                'total_tasks' => $memberTasks->count(),
                'completed_count' => $memberTasks->where('status', 'Completed')->count(),
                'in_progress_count' => $memberTasks->whereIn('status', ['In Progress', 'Being Developed', 'Ready for QA', 'Assigned to QA'])->count(),
                'pending_count' => $memberTasks->where('status', 'Yet to Start')->count(),
                'overdue_count' => $memberTasks->where('is_overdue', true)->count(),
                'tasks' => $memberTasks,
            ];
        })->values();

        // Optional time tracking / Attendance summary
        $timeTrackingData = [];
        if ($request->boolean('include_time_tracking')) {
            $attendances = Attendance::whereDate('date', $targetDate)
                ->whereIn('user_id', $memberIds)
                ->get()
                ->keyBy('user_id');

            foreach ($members as $m) {
                $att = $attendances->get($m->id);
                $timeTrackingData[$m->id] = [
                    'working_hours' => $att?->total_working_hours ?? '—',
                    'effective_hours' => $att?->effective_working_hours ?? '—',
                    'status' => $att?->status ?? '—',
                    'check_in' => $att?->check_in_time ? \Carbon\Carbon::parse($att->check_in_time)->format('h:i A') : '—',
                    'check_out' => $att?->check_out_time ? \Carbon\Carbon::parse($att->check_out_time)->format('h:i A') : '—',
                ];
            }
        }

        // Teams list for Team Lead / Admin selection
        $availableTeams = [];
        if ($isSuperAdmin || $isAdmin) {
            $availableTeams = Team::select('id', 'name', 'code')->get();
        } elseif ($isTeamLead) {
            $ledTeamIds = Team::where('team_lead_id', $user->id)->pluck('id')->toArray();
            if ($user->team_id) {
                $ledTeamIds[] = $user->team_id;
            }
            $availableTeams = Team::whereIn('id', array_unique($ledTeamIds))->select('id', 'name', 'code')->get();
        }

        return response()->json([
            'role' => $isSuperAdmin ? 'Super Admin' : ($isAdmin ? 'Admin' : ($isTeamLead ? 'Team Lead' : 'Employee')),
            'report_type' => $reportType,
            'date' => $targetDate,
            'team' => $selectedTeam ? ['id' => $selectedTeam->id, 'name' => $selectedTeam->name, 'code' => $selectedTeam->code] : null,
            'available_teams' => $availableTeams,
            'team_members' => $members->map(fn ($m) => [
                'id' => $m->id,
                'name' => trim("{$m->first_name} {$m->last_name}"),
                'designation' => $m->designation ?? $m->role,
                'employee_code' => $m->employee_code,
            ]),
            'summary' => [
                'total_members' => $members->count(),
                'total_tasks' => $tasksData->count(),
                'completed' => $completedCount,
                'in_progress' => $inProgressCount,
                'pending' => $pendingCount,
                'on_hold' => $onHoldCount,
                'overdue' => $overdueCount,
            ],
            'member_reports' => $memberReports,
            'tasks' => $tasksData,
            'time_tracking' => $timeTrackingData,
        ]);
    }

    /**
     * Download Sample CSV template for task imports.
     */
    public function sampleCSV()
    {
        $headers = [
            'project_name',
            'title',
            'description',
            'sub_phase',
            'priority',
            'status',
            'start_date',
            'due_date',
            'allotted_days',
            'time_taken',
            'assignee_codes',
            'remarks',
        ];

        $sampleRows = [
            [
                'ACCOS - NW1 London',
                'Header & Navigation Redesign',
                'Revamp main navigation bar and responsive mobile drawer',
                'UI/UX Design',
                'High',
                'Yet to Start',
                now()->toDateString(),
                now()->addDays(2)->toDateString(),
                '2.0',
                '16.0',
                'EMP001, EMP002',
                'Awaiting Figma approval',
            ],
            [
                'ACCOS - NW1 London',
                'Stripe & Apple Pay Integration',
                'Implement checkout session webhook and token payment handler',
                'Development',
                'Critical',
                'In Progress',
                now()->toDateString(),
                now()->addDays(4)->toDateString(),
                '4.0',
                '32.0',
                'EMP003',
                'Backend architecture ready',
            ],
            [
                'General Project',
                'Cross-Browser QA Smoke Tests',
                'Verify Safari, Chrome, and Firefox layout stability',
                'QA Testing',
                'Medium',
                'Yet to Start',
                now()->addDays(1)->toDateString(),
                now()->addDays(3)->toDateString(),
                '1.5',
                '12.0',
                'EMP004',
                'Run automated suite first',
            ]
        ];

        $filename = 'tasks-import-template-' . date('Y-m-d') . '.csv';
        $handle = fopen('php://memory', 'r+');

        // Write UTF-8 BOM for Excel compatibility
        fputs($handle, "\xEF\xBB\xBF");
        fputcsv($handle, $headers);

        foreach ($sampleRows as $row) {
            fputcsv($handle, $row);
        }

        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }

    /**
     * Helper to parse flexible date strings (YYYY-MM-DD or DD-MM-YYYY or DD/MM/YYYY).
     */
    private function parseTaskDate(?string $dateStr): ?string
    {
        if (empty($dateStr)) {
            return null;
        }
        $dateStr = trim($dateStr);
        // Handle Excel numeric serial dates (e.g. 45532)
        if (is_numeric($dateStr) && (int)$dateStr > 25000 && (int)$dateStr < 70000) {
            try {
                return \Carbon\Carbon::create(1899, 12, 30)->addDays((int)$dateStr)->toDateString();
            } catch (\Throwable $e) {}
        }
        $formats = ['Y-m-d', 'd-m-Y', 'd/m/Y', 'Y/m/d', 'm/d/Y', 'Y-m-d H:i:s', 'd/m/Y H:i:s'];
        foreach ($formats as $fmt) {
            try {
                $d = \Carbon\Carbon::createFromFormat($fmt, $dateStr);
                if ($d !== false) {
                    return $d->toDateString();
                }
            } catch (\Throwable $e) {
                // Continue to next format
            }
        }
        try {
            return \Carbon\Carbon::parse($dateStr)->toDateString();
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Bulk import tasks from CSV file or JSON array.
     */
    public function importCSV(Request $request)
    {
        @set_time_limit(300);
        @ini_set('memory_limit', '256M');

        $user = $request->user();

        $canImport = $user->hasRole('Super Admin')
            || $user->hasRole('Admin')
            || $user->hasRole('Team Lead')
            || $user->can('manage projects')
            || $user->can('create projects')
            || in_array(strtolower($user->role ?? ''), ['super admin', 'admin', 'team lead'], true);

        if (!$canImport) {
            return response()->json(['message' => 'Unauthorized: Only Team Leads and Administrators can import tasks.'], 403);
        }

        $defaultProjectId = $request->input('project_id');
        $rawRows = [];

        if ($request->hasFile('file')) {
            $request->validate([
                'file' => 'required|file|max:20480',
            ]);

            $file = $request->file('file');
            $ext = strtolower($file->getClientOriginalExtension());
            if (!in_array($ext, ['csv', 'txt', 'tsv'], true)) {
                return response()->json(['message' => 'Please upload a valid CSV (.csv) file.'], 422);
            }

            $handle = fopen($file->getRealPath(), 'r');
            if (!$handle) {
                return response()->json(['message' => 'Unable to read the uploaded CSV file.'], 422);
            }

            // Strip UTF-8 BOM if present
            $bom = fread($handle, 3);
            if ($bom !== "\xEF\xBB\xBF") {
                rewind($handle);
            }

            $rawHeaders = fgetcsv($handle);
            if (!$rawHeaders || empty(array_filter($rawHeaders))) {
                fclose($handle);
                return response()->json(['message' => 'The uploaded CSV file is empty or missing headers.'], 422);
            }

            $normalizedHeaders = array_map(function ($h) {
                return strtolower(trim(preg_replace('/[^a-zA-Z0-9_]/', '_', $h)));
            }, $rawHeaders);

            while (($row = fgetcsv($handle)) !== false) {
                if (empty(array_filter($row))) continue;
                if (count($row) < count($normalizedHeaders)) {
                    $row = array_pad($row, count($normalizedHeaders), '');
                }
                $rawRows[] = array_combine($normalizedHeaders, array_slice($row, 0, count($normalizedHeaders)));
            }
            fclose($handle);
        } elseif ($request->has('tasks') && is_array($request->input('tasks'))) {
            $rawRows = $request->input('tasks');
        } else {
            return response()->json(['message' => 'Please provide a valid CSV file or task data payload.'], 422);
        }

        if (empty($rawRows)) {
            return response()->json(['message' => 'No task data found in the CSV.'], 422);
        }

        // Cache lookups for performance
        $allProjects = Project::select('id', 'name', 'team_id', 'project_coordinator_id')->get();
        $projectByName = $allProjects->keyBy(fn ($p) => strtolower(trim(preg_replace('/[^a-zA-Z0-9]/', '', $p->name))));
        $projectById = $allProjects->keyBy('id');

        $allUsers = User::where('status', 'Active')
            ->select('id', 'first_name', 'last_name', 'email', 'employee_code', 'team_id')
            ->get();
        $userByCode = $allUsers->whereNotNull('employee_code')->keyBy(fn ($u) => strtolower(trim($u->employee_code)));
        $userByEmail = $allUsers->keyBy(fn ($u) => strtolower(trim($u->email)));
        $userByName = $allUsers->keyBy(fn ($u) => strtolower(trim("{$u->first_name} {$u->last_name}")));

        $allSubPhases = \App\Models\ProjectSubPhase::all();

        // Team Lead authorization scope
        $isTeamLead = $user->hasRole('Team Lead') || strtolower($user->role ?? '') === 'team lead';
        $isSuperAdmin = $user->hasRole('Super Admin') || in_array(strtolower($user->role ?? ''), ['super admin', 'admin'], true);
        $ledTeamIds = [];
        if ($isTeamLead) {
            $ledTeamIds = Team::where('team_lead_id', $user->id)->pluck('id')->toArray();
            if ($user->team_id) {
                $ledTeamIds[] = $user->team_id;
            }
            $ledTeamIds = array_values(array_unique(array_filter($ledTeamIds)));
        }

        $imported = 0;
        $failed = 0;
        $errors = [];

        foreach ($rawRows as $idx => $row) {
            $rowNum = $idx + 2; // 1-based row index accounting for header

            // 1. Resolve Task Title
            $title = trim($row['title'] ?? $row['task_title'] ?? $row['name'] ?? '');
            if (empty($title)) {
                $errors[] = "Row {$rowNum}: Task title is missing.";
                $failed++;
                continue;
            }

            // 2. Resolve Project
            $projectName = trim($row['project_name'] ?? $row['project'] ?? '');
            $rowProjectId = $row['project_id'] ?? null;
            $matchedProject = null;

            if (!empty($rowProjectId) && $projectById->has($rowProjectId)) {
                $matchedProject = $projectById->get($rowProjectId);
            } elseif (!empty($projectName)) {
                $pClean = strtolower(trim(preg_replace('/[^a-zA-Z0-9]/', '', $projectName)));
                if ($projectByName->has($pClean)) {
                    $matchedProject = $projectByName->get($pClean);
                } else {
                    // Fuzzy fallback
                    $matchedProject = $allProjects->first(function ($p) use ($pClean) {
                        $cName = strtolower(trim(preg_replace('/[^a-zA-Z0-9]/', '', $p->name)));
                        return $cName === $pClean || (strlen($pClean) > 3 && str_contains($cName, $pClean)) || (strlen($cName) > 3 && str_contains($pClean, $cName));
                    });
                }
            }

            // Default project fallback
            if (!$matchedProject && !empty($defaultProjectId) && $projectById->has($defaultProjectId)) {
                $matchedProject = $projectById->get($defaultProjectId);
            }

            // If still no project found, auto-create a project with this name
            if (!$matchedProject && !empty($projectName)) {
                try {
                    $matchedProject = Project::create([
                        'name' => $projectName,
                        'status' => 'Active',
                        'project_type' => 'Client',
                        'team_id' => $user->team_id,
                        'start_date' => now()->toDateString(),
                        'created_by' => $user->id,
                    ]);
                    $allProjects->push($matchedProject);
                    $projectByName->put(strtolower(trim(preg_replace('/[^a-zA-Z0-9]/', '', $matchedProject->name))), $matchedProject);
                    $projectById->put($matchedProject->id, $matchedProject);
                } catch (\Throwable $e) {
                    \Log::error("Failed to auto-create project '{$projectName}': " . $e->getMessage());
                }
            }

            if (!$matchedProject) {
                $errors[] = "Row {$rowNum}: Project '" . ($projectName ?: "ID: {$rowProjectId}") . "' could not be resolved.";
                $failed++;
                continue;
            }

            // Team Lead Scope Verification
            if ($isTeamLead && !$isSuperAdmin) {
                $hasAccess = $matchedProject->team_id === null
                    || in_array($matchedProject->team_id, $ledTeamIds, true)
                    || $matchedProject->project_coordinator_id === $user->id
                    || $matchedProject->created_by === $user->id;
                if (!$hasAccess) {
                    $errors[] = "Row {$rowNum}: You are not authorized to add tasks to project '{$matchedProject->name}'.";
                    $failed++;
                    continue;
                }
            }

            // 3. Resolve Sub-Phase
            $subPhaseName = trim($row['sub_phase'] ?? $row['sub_phase_name'] ?? $row['phase'] ?? '');
            $subPhaseId = null;
            if (!empty($subPhaseName)) {
                $spKey = strtolower(trim($subPhaseName));
                $matchedSp = $allSubPhases->first(function ($sp) use ($spKey, $matchedProject) {
                    $matchName = strtolower(trim($sp->name)) === $spKey;
                    $matchTeam = $sp->team_id === null || $sp->team_id === $matchedProject->team_id;
                    return $matchName && $matchTeam;
                });

                if ($matchedSp) {
                    $subPhaseId = $matchedSp->id;
                } else {
                    // Auto-create sub-phase so tasks retain their category
                    try {
                        $newSp = \App\Models\ProjectSubPhase::create([
                            'name' => $subPhaseName,
                            'team_id' => $matchedProject->team_id,
                            'display_order' => $allSubPhases->count() + 1,
                            'is_active' => true,
                            'created_by' => $user->id,
                        ]);
                        $allSubPhases->push($newSp);
                        $subPhaseId = $newSp->id;
                    } catch (\Throwable $e) {}
                }
            }

            // 4. Resolve Priority & Status
            $rawPriority = ucfirst(strtolower(trim($row['priority'] ?? 'Medium')));
            $priority = in_array($rawPriority, ['Low', 'Medium', 'High', 'Critical'], true) ? $rawPriority : 'Medium';

            $rawStatus = trim($row['status'] ?? 'Yet to Start');
            $validStatuses = [
                'Yet to Start', 'Being Developed', 'Ready for QA', 'Assigned to QA',
                'In Progress', 'On Hold', 'Completed', 'Forecast', 'Rejected'
            ];
            $status = 'Yet to Start';
            foreach ($validStatuses as $vs) {
                if (strcasecmp($vs, $rawStatus) === 0) {
                    $status = $vs;
                    break;
                }
            }

            // 5. Dates and Estimates
            $startDate = $this->parseTaskDate($row['start_date'] ?? null) ?: now()->toDateString();
            $dueDate = $this->parseTaskDate($row['due_date'] ?? null) ?: now()->addDays(2)->toDateString();
            $allottedDays = isset($row['allotted_days']) && is_numeric($row['allotted_days']) ? (float) $row['allotted_days'] : 1.0;
            $timeTaken = isset($row['time_taken']) && is_numeric($row['time_taken']) ? (float) $row['time_taken'] : 0.0;
            $description = trim($row['description'] ?? $row['details'] ?? '');
            $remarks = trim($row['remarks'] ?? $row['current_updates'] ?? $row['notes'] ?? '');

            // 6. Resolve Assignees
            $rawAssignees = trim($row['assignee_codes'] ?? $row['assignee_emails'] ?? $row['assignees'] ?? $row['assignee'] ?? '');
            $assigneeIds = [];
            if (!empty($rawAssignees)) {
                $tokens = array_filter(array_map('trim', explode(',', $rawAssignees)));
                foreach ($tokens as $token) {
                    $tokKey = strtolower($token);
                    $matchedUser = null;
                    if ($userByCode->has($tokKey)) {
                        $matchedUser = $userByCode->get($tokKey);
                    } elseif ($userByEmail->has($tokKey)) {
                        $matchedUser = $userByEmail->get($tokKey);
                    } elseif ($userByName->has($tokKey)) {
                        $matchedUser = $userByName->get($tokKey);
                    }

                    if ($matchedUser && !in_array($matchedUser->id, $assigneeIds, true)) {
                        $assigneeIds[] = $matchedUser->id;
                    }
                }
            }

            // 7. Direct Fast Task Creation
            try {
                $taskData = [
                    'project_id' => $matchedProject->id,
                    'team_id' => $matchedProject->team_id,
                    'sub_phase_id' => $subPhaseId,
                    'title' => $title,
                    'description' => $description ?: null,
                    'priority' => $priority,
                    'status' => $status,
                    'start_date' => $startDate,
                    'due_date' => $dueDate,
                    'allotted_days' => $allottedDays,
                    'time_taken' => $timeTaken,
                    'current_updates' => $remarks ?: null,
                    'created_by' => $user->id,
                ];

                if ($status === 'Completed') {
                    $taskData['actual_completion_date'] = $dueDate ?: now()->toDateString();
                }

                $task = ProjectTask::create($taskData);

                if (!empty($assigneeIds)) {
                    foreach ($assigneeIds as $aIdx => $aId) {
                        ProjectTaskAssignee::firstOrCreate(
                            ['task_id' => $task->id, 'user_id' => $aId],
                            ['assigned_by' => $user->id, 'is_primary' => $aIdx === 0]
                        );
                    }
                }

                $imported++;
            } catch (\Throwable $e) {
                $errors[] = "Row {$rowNum}: Failed to save task '{$title}' ({$e->getMessage()})";
                $failed++;
            }
        }

        return response()->json([
            'message' => "Import complete: {$imported} tasks successfully imported" . ($failed > 0 ? " ({$failed} rows skipped)" : "."),
            'imported_count' => $imported,
            'skipped_count' => $failed,
            'errors' => $errors,
        ], 200);
    }
}
