<?php

namespace App\Notifications;

use App\Models\WfhRequest;
use Illuminate\Notifications\Notification;

class WfhRequestNotification extends Notification
{
    public function __construct(
        public string $event,
        public WfhRequest $wfhRequest,
        public string $message
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        $titles = [
            'submitted' => 'New WFH Request',
            'approved'  => 'WFH Approved',
            'rejected'  => 'WFH Rejected',
        ];

        $actionUrl = in_array($this->event, ['submitted', 'tl_approved']) ? '/leaves/approvals' : '/wfh';

        return [
            'title'          => $titles[$this->event] ?? 'WFH Update',
            'message'        => $this->message,
            'event'          => $this->event,
            'wfh_request_id' => $this->wfhRequest->id,
            'action_url'     => $actionUrl,
        ];
    }
}
