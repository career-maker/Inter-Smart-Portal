<?php

namespace App\Notifications;

use App\Models\ProfileUpdateRequest;
use Illuminate\Notifications\Notification;

class ProfileUpdateRequestNotification extends Notification
{
    public function __construct(
        public string $event,
        public ProfileUpdateRequest $profileRequest,
        public string $message
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        $titles = [
            'submitted' => 'Profile Update Request',
            'approved'  => 'Profile Update Approved',
            'rejected'  => 'Profile Update Rejected',
        ];

        $actionUrl = $this->event === 'submitted'
            ? '/profile-requests'
            : '/profile';

        $user = $this->profileRequest->user;
        $userName = $user ? trim("{$user->first_name} {$user->last_name}") : null;

        return [
            'title'                     => $titles[$this->event] ?? 'Profile Update',
            'message'                   => $this->message,
            'event'                     => $this->event,
            'profile_update_request_id' => $this->profileRequest->id,
            'user_id'                   => $this->profileRequest->user_id,
            'user_name'                 => $userName,
            'employee_code'             => $user?->employee_code,
            'action_url'                => $actionUrl,
        ];
    }

    public function toArray($notifiable): array
    {
        return $this->toDatabase($notifiable);
    }
}
