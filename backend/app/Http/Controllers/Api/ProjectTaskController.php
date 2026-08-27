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
            'project:id,name,project_type,category,project_coordinator_id',
            'project.coordinator:id,first_name,last_name',
            'coordinator:id,first_name,last_name',
            'subPhase:id,name',
            'catalogTask:id,name,category',
            'assignees:id,first_name,last_name',
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

        foreach (['project_id', 'sub_phase_id', 'team_id'] as $filter) {
            if ($request->filled($filter)) {
                $query->where($filter, (int) $request->input($filter));
            }
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
                $targetUser = User::whereIn('team_id', array_unique($ledTeamIds))->find($targetUserId);
                if (!$targetUser) {
                    return response()->json(['message' => 'Unauthorized: Target member not in your team.'], 403);
                }
                $members = collect([$targetUser]);
                $selectedTeam = Team::find($targetUser->team_id);
            } else {
                $targetUser = User::find($targetUserId) ?: $user;
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
}
