<?php

namespace App\Services\ProjectManagement;

use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\ProjectTaskAssignee;
use App\Models\User;
use App\Notifications\TaskAssignedNotification;
use App\Notifications\TaskChangedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class ProjectTaskService
{
    /** Tracked fields for the coordinator diff notification — mirrors the legacy QA Tracker's own tracked-field list (notes §6.4). */
    private const DIFF_TRACKED_FIELDS = [
        'status', 'priority', 'sub_phase_id', 'start_date', 'due_date',
        'coordinator_id', 'current_updates', 'deviation_reason',
    ];

    public function __construct(
        private readonly ProjectAuthorizationService $auth,
        private readonly ProjectAuditLogger $auditLogger,
    ) {}

    public function createTask(Project $project, array $data, User $actor, ?Request $request = null): ProjectTask
    {
        if (!empty($data['coordinator_id'])) {
            $this->assertCoordinatorEligible((int) $data['coordinator_id']);
        }

        $task = ProjectTask::create(array_merge($data, [
            'project_id' => $project->id,
            'team_id' => $data['team_id'] ?? $project->team_id,
            'created_by' => $actor->id,
        ]));

        $this->auditLogger->log($actor, 'pm.task.created', $task, [], $task->toArray(), $request);
        $this->notifyResolvedCoordinator($task, 'created', []);

        return $task;
    }

    /**
     * $data must already be filtered by the caller to only the fields
     * they're authorized to change (planning vs. execution split — see
     * ProjectTask::PLANNING_FIELDS / ::EXECUTION_FIELDS and Decision 2).
     */
    public function updateTask(ProjectTask $task, array $data, User $actor, ?Request $request = null): ProjectTask
    {
        if (array_key_exists('coordinator_id', $data) && $data['coordinator_id']) {
            $this->assertCoordinatorEligible((int) $data['coordinator_id']);
        }

        $previous = $task->only(array_keys($data));

        // Achievement-date auto-fill: transitioning to Completed fills
        // actual_completion_date with today if not already set — app
        // logic, never a DB trigger (Decision 1 / design doc §5).
        if (($data['status'] ?? null) === 'Completed'
            && empty($data['actual_completion_date'])
            && !$task->actual_completion_date) {
            $data['actual_completion_date'] = Carbon::today('Asia/Kolkata')->toDateString();
        }

        // Recompute deviation whenever either side of the formula changes.
        if (array_key_exists('days_taken', $data) || array_key_exists('allotted_days', $data)) {
            $daysTaken = $data['days_taken'] ?? $task->days_taken ?? 0;
            $allotted = $data['allotted_days'] ?? $task->allotted_days ?? 0;
            $data['deviation'] = round($daysTaken - $allotted, 2);
        }

        $task->fill(array_merge($data, ['updated_by' => $actor->id]));
        $task->save();

        $new = $task->only(array_keys($data));

        $action = array_key_exists('status', $data) && $data['status'] !== ($previous['status'] ?? null)
            ? 'pm.task.status_changed'
            : 'pm.task.updated';

        $this->auditLogger->log($actor, $action, $task, $previous, $new, $request);

        $diff = $this->buildDiff($previous, $new);
        if (!empty($diff)) {
            $this->notifyResolvedCoordinator($task, 'updated', $diff);
        }

        return $task;
    }

    public function assignUser(ProjectTask $task, int $userId, User $actor, bool $isPrimary = false, ?Request $request = null): ProjectTaskAssignee
    {
        $assignee = ProjectTaskAssignee::firstOrCreate(
            ['task_id' => $task->id, 'user_id' => $userId],
            ['assigned_by' => $actor->id, 'is_primary' => $isPrimary]
        );

        if ($assignee->wasRecentlyCreated) {
            $this->auditLogger->log($actor, 'pm.task.assignee_added', $task, [], ['user_id' => $userId], $request);

            try {
                $assignedUser = User::find($userId);
                if ($assignedUser && $assignedUser->id !== $actor->id) {
                    $assignedUser->notify(new TaskAssignedNotification(
                        $task,
                        "{$actor->first_name} {$actor->last_name} assigned you to the task \"{$task->title}\"."
                    ));
                }
            } catch (\Throwable $e) {
                \Log::warning('TaskAssignedNotification failed: ' . $e->getMessage());
            }
        }

        return $assignee;
    }

    public function unassignUser(ProjectTask $task, int $userId, User $actor, ?Request $request = null): void
    {
        $deleted = ProjectTaskAssignee::where('task_id', $task->id)->where('user_id', $userId)->delete();

        if ($deleted) {
            $this->auditLogger->log($actor, 'pm.task.assignee_removed', $task, ['user_id' => $userId], [], $request);
        }
    }

    public function setCoordinator(ProjectTask $task, ?int $userId, User $actor, ?Request $request = null): ProjectTask
    {
        if ($userId !== null) {
            $this->assertCoordinatorEligible($userId);
        }

        $previous = ['coordinator_id' => $task->coordinator_id];
        $task->update(['coordinator_id' => $userId, 'updated_by' => $actor->id]);

        $this->auditLogger->log($actor, 'pm.task.coordinator_changed', $task, $previous, ['coordinator_id' => $userId], $request);

        return $task;
    }

    public function assertCoordinatorEligible(int $userId): void
    {
        $user = User::find($userId);

        if (!$user) {
            throw ValidationException::withMessages([
                'coordinator_id' => 'The selected coordinator does not exist.',
            ]);
        }

        if (!$this->auth->isEligibleCoordinator($user)) {
            throw ValidationException::withMessages([
                'coordinator_id' => 'The selected user is not eligible to be a Project Coordinator — they must belong to the "Project Coordinators" department.',
            ]);
        }
    }

    /** @return array<string,array{previous:mixed,new:mixed}> */
    private function buildDiff(array $previous, array $new): array
    {
        $diff = [];
        foreach (self::DIFF_TRACKED_FIELDS as $field) {
            if (array_key_exists($field, $new) && ($previous[$field] ?? null) != $new[$field]) {
                $diff[$field] = ['previous' => $previous[$field] ?? null, 'new' => $new[$field]];
            }
        }

        return $diff;
    }

    /**
     * Notifies the RESOLVED coordinator only (task-level override, else
     * the project's) — never every member of the Project Coordinators
     * department. See ProjectAuthorizationService::resolveTaskCoordinator().
     */
    private function notifyResolvedCoordinator(ProjectTask $task, string $event, array $diff): void
    {
        try {
            $coordinator = $this->auth->resolveTaskCoordinator($task->fresh(['project']));
            if ($coordinator) {
                $coordinator->notify(new TaskChangedNotification($task, $event, $diff));
            }
        } catch (\Throwable $e) {
            \Log::warning('TaskChangedNotification failed: ' . $e->getMessage());
        }
    }
}
