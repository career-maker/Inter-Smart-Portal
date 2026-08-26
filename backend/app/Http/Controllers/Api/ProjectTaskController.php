<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AssignProjectTaskRequest;
use App\Http\Requests\StoreProjectTaskRequest;
use App\Http\Requests\UpdateProjectTaskRequest;
use App\Http\Requests\UpdateProjectTaskStatusRequest;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Services\ProjectManagement\ProjectAuthorizationService;
use App\Services\ProjectManagement\ProjectTaskService;
use Illuminate\Http\Request;

class ProjectTaskController extends Controller
{
    public function __construct(
        private readonly ProjectAuthorizationService $auth,
        private readonly ProjectTaskService $tasks,
    ) {}

    public function index(Request $request)
    {
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

        if (!$this->auth->canCreateTask($user, $project)) {
            return response()->json(['message' => 'Unauthorized to create tasks for this project.'], 403);
        }

        $data = $request->validated();
        $assigneeIds = $data['assignee_ids'] ?? [];
        unset($data['assignee_ids']);

        // Team Leads create tasks for their own HR team by default and can only assign own-team members
        if ($user->hasRole('Team Lead') && !$user->hasRole('Super Admin')) {
            $data['team_id'] = $user->team_id;

            if (!empty($assigneeIds)) {
                $invalidCount = \App\Models\User::whereIn('id', $assigneeIds)
                    ->where(function ($q) use ($user) {
                        $q->whereNull('team_id')
                          ->orWhere('team_id', '!=', $user->team_id);
                    })
                    ->count();

                if ($invalidCount > 0) {
                    return response()->json(['message' => 'Team Leads may only assign tasks to members of their own HR team.'], 403);
                }
            }
        }

        $task = $this->tasks->createTask($project, $data, $user, $request);

        foreach ($assigneeIds as $index => $assigneeId) {
            $this->tasks->assignUser($task, (int) $assigneeId, $user, $index === 0, $request);
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
}
