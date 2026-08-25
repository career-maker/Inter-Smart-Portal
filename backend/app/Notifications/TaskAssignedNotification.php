<?php

namespace App\Notifications;

use App\Models\ProjectTask;
use Illuminate\Notifications\Notification;

class TaskAssignedNotification extends Notification
{
    public function __construct(
        public ProjectTask $task,
        public string $message
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title' => 'Task Assigned',
            'message' => $this->message,
            'event' => 'task_assigned',
            'task_id' => $this->task->id,
            'project_id' => $this->task->project_id,
            'action_url' => "/project-management/tasks/my",
        ];
    }
}
