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
            'submitted'   => 'New WFH Request',
            'approved'    => 'WFH Approved',
            'tl_approved' => 'WFH Approved by TL',
            'rejected'    => 'WFH Rejected',
            'tl_rejected' => 'WFH Rejected by Approver',
        ];

        $actionUrl = in_array($this->event, ['submitted', 'tl_approved', 'tl_rejected']) ? '/leaves/approvals?tab=wfh' : '/wfh';

        return [
            'title'          => $titles[$this->event] ?? 'WFH Update',
            'message'        => $this->message,
            'event'          => $this->event,
            'wfh_request_id' => $this->wfhRequest->id,
            'action_url'     => $actionUrl,
        ];
    }
}
