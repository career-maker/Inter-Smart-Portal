<?php

namespace App\Notifications;

use App\Models\Project;
use Illuminate\Notifications\Notification;

class ProjectMemberAddedNotification extends Notification
{
    public function __construct(
        public Project $project,
        public string $message
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title' => 'Added to Project',
            'message' => $this->message,
            'event' => 'member_added',
            'project_id' => $this->project->id,
            'action_url' => "/project-management/projects/{$this->project->id}",
        ];
    }
}
