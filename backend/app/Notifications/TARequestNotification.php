<?php

namespace App\Notifications;

use App\Models\TARequest;
use Illuminate\Notifications\Notification;

class TARequestNotification extends Notification
{
    public function __construct(
        public TARequest $taRequest,
        public string $message,
        public string $title = 'New Travel Allowance Request',
        public string $event = 'ta_requested',
        public string $actionUrl = '/ta/management'
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title'         => $this->title,
            'message'       => $this->message,
            'event'         => $this->event,
            'ta_request_id' => $this->taRequest->id,
            'action_url'    => $this->actionUrl,
        ];
    }
}
