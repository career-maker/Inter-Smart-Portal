<?php

namespace App\Notifications;

use App\Models\ProjectTask;
use Illuminate\Notifications\Notification;

/**
 * Sent to a task's RESOLVED coordinator (task-level override if set,
 * else the parent project's coordinator) on create/update, carrying a
 * field-level diff — this is the direct replacement for the legacy QA
 * Tracker's single most reliably-wired notification trigger (PC email +
 * in-app notification on every task create/update, notes §6.3/§6.4/§14.3
 * — Gap A1 in the validation report).
 *
 * Recipient is ALWAYS resolved from the actual coordinator_id/
 * project_coordinator_id FK on the record that changed — never from
 * "everyone in the Project Coordinators department". See
 * ProjectAuthorizationService::resolveTaskCoordinator().
 */
class TaskChangedNotification extends Notification
{
    /**
     * @param  array<string,array{previous:mixed,new:mixed}>  $changes
     */
    public function __construct(
        public ProjectTask $task,
        public string $event, // 'created' | 'updated'
        public array $changes = []
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title' => $this->event === 'created' ? 'New Task in Coordinated Project' : 'Task Updated',
            'message' => $this->event === 'created'
                ? "A new task \"{$this->task->title}\" was created in a project you coordinate."
                : "Task \"{$this->task->title}\" was updated in a project you coordinate.",
            'event' => "task_{$this->event}",
            'task_id' => $this->task->id,
            'project_id' => $this->task->project_id,
            'changes' => $this->changes,
            'action_url' => "/project-management/tasks/{$this->task->id}",
        ];
    }
}
