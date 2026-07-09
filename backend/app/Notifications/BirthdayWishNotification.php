<?php

namespace App\Notifications;

use App\Models\BirthdayWish;
use Illuminate\Notifications\Notification;

class BirthdayWishNotification extends Notification
{
    public function __construct(
        public BirthdayWish $wish,
        public string $senderName
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title'   => '🎂 Birthday Wish!',
            'message' => "{$this->senderName} sent you a birthday wish!",
            'wish_id' => $this->wish->id,
            'action_url' => '/birthday-wishes',
        ];
    }
}
