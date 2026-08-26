<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class PollNotification extends Notification
{
    public function __construct(
        public string $authorName,
        public string $pollQuestion,
        public int $postId
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title'      => 'New Community Poll 📊',
            'message'    => "{$this->authorName} created a new poll: \"{$this->pollQuestion}\"",
            'post_id'    => $this->postId,
            'action_url' => '/community',
        ];
    }
}
