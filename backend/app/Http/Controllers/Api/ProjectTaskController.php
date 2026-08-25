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
        $query = ProjectTask::query()->with(['project:id,name', 'subPhase:id,name']);

        if (!$user->hasRole('Super Admin') && !$user->can('view all projects')) {
            $query->where(function ($q) use ($user) {
                $q->whereHas('project', function ($p) use ($user) {
                    $p->where('project_coordinator_id', $user->id)
                      ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
                    if ($user->hasRole('Team Lead') && $user->team_id) {
                        $p->orWhere('team_id', $user->team_id);
                    }
                });

                // Guarded explicitly: an unguarded ->orWhere('team_id', $user->team_id)
                // would silently become `OR team_id IS NULL` for any user with no
                // team at all (Eloquent converts a null value to whereNull), which
                // would over-broadly expose every team-less task to every such user.
                if ($user->hasRole('Team Lead') && $user->team_id) {
                    $q->orWhere('team_id', $user->team_id);
                }

                $q->orWhere('coordinator_id', $user->id)
                  ->orWhereHas('taskAssignees', fn ($a) => $a->where('user_id', $user->id));
            });
        }

        foreach (['project_id', 'sub_phase_id', 'team_id'] as $filter) {
            if ($request->filled($filter)) {
                $query->where($filter, (int) $request->input($filter));
            }
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('assignee_id')) {
            $assigneeId = (int) $request->input('assignee_id');
            $query->whereHas('taskAssignees', fn ($a) => $a->where('user_id', $assigneeId));
        }

        return response()->json($query->orderBy('due_date')->paginate(20));
    }

    public function my(Request $request)
    {
        $user = $request->user();

        $tasks = ProjectTask::query()
            ->whereHas('taskAssignees', fn ($a) => $a->where('user_id', $user->id))
            ->with(['project:id,name', 'subPhase:id,name'])
            ->orderBy('due_date')
            ->paginate(20);

        return response()->json($tasks);
    }

    public function store(StoreProjectTaskRequest $request, Project $project)
    {
        $user = $request->user();

        if (!$this->auth->canCreateTaskForTeam($user, $project->team_id)) {
            return response()->json(['message' => 'Unauthorized to create tasks for this project.'], 403);
        }

        $data = $request->validated();
        $assigneeIds = $data['assignee_ids'] ?? [];
        unset($data['assignee_ids']);

        $task = $this->tasks->createTask($project, $data, $user, $request);

        foreach ($assigneeIds as $index => $assigneeId) {
            $this->tasks->assignUser($task, (int) $assigneeId, $user, $index === 0, $request);
        }

        return response()->json(['message' => 'Task created successfully.', 'data' => $task->load('assignees')], 201);
    }

    public function show(Request $request, ProjectTask $task)
    {
        $user = $request->user();

        if (!$this->auth->canViewTask($user, $task)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $task->load(['project:id,name,team_id', 'subPhase:id,name', 'coordinator:id,first_name,last_name', 'assignees:id,first_name,last_name']);

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

        return response()->json(['message' => 'Task updated successfully.', 'data' => $task]);
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
