<?php

namespace App\Notifications;

use App\Models\Recognition;
use Illuminate\Notifications\Notification;

class RecognitionNotification extends Notification
{
    public function __construct(
        public Recognition $recognition,
        public string $message
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title'          => 'Award Received! 🏆',
            'message'        => $this->message,
            'recognition_id' => $this->recognition->id,
            'action_url'     => '/hall',
        ];
    }
}
