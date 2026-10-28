<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

/** Generic database notification for the Accounts module (payments, budget changes, holds). */
class AccountsNotification extends Notification
{
    public function __construct(
        public string $title,
        public string $message,
        public string $event,
        public ?int $projectId = null
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title' => $this->title,
            'message' => $this->message,
            'event' => $this->event,
            'project_id' => $this->projectId,
            'action_url' => \App\Support\NotificationLink::for($this->event, $this->projectId, $notifiable),
        ];
    }
}
