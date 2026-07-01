<?php

namespace App\Notifications;

use App\Models\Issue;
use Illuminate\Notifications\Notification;

class IssueNotification extends Notification
{
    public function __construct(
        public Issue $issue,
        public string $message
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title'      => 'New Issue Raised',
            'message'    => $this->message,
            'event'      => 'issue_raised',
            'issue_id'   => $this->issue->id,
            'action_url' => '/issues/' . $this->issue->id,
        ];
    }
}
