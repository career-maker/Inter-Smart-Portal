<?php

namespace App\Notifications;

use App\Models\LeaveRequest;
use Illuminate\Notifications\Notification;

class LeaveRequestNotification extends Notification
{
    public function __construct(
        public string $event,
        public LeaveRequest $leaveRequest,
        public string $message
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        $titles = [
            'submitted'   => 'New Leave Request',
            'approved'    => 'Leave Approved',
            'tl_approved' => 'Leave Approved by TL',
            'rejected'    => 'Leave Rejected',
            'tl_rejected' => 'Leave Rejected by Approver',
            'cancelled'   => 'Leave Cancelled',
        ];

        // Approver notifications (submitted / tl_approved / tl_rejected) → approvals page
        // Employee notifications (approved/rejected) → their own leaves list
        $actionUrl = in_array($this->event, ['submitted', 'tl_approved', 'tl_rejected']) ? '/leaves/approvals' : '/leaves';

        return [
            'title'            => $titles[$this->event] ?? 'Leave Update',
            'message'          => $this->message,
            'event'            => $this->event,
            'leave_request_id' => $this->leaveRequest->id,
            'action_url'       => $actionUrl,
        ];
    }
}
