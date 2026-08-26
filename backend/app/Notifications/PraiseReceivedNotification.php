<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class PraiseReceivedNotification extends Notification
{
    public function __construct(
        public string $authorName,
        public ?string $badgeName,
        public string $postContent,
        public int $postId
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        $badgeText = $this->badgeName ? " with {$this->badgeName}" : "";
        return [
            'title'      => 'You Received a Praise! 🎖️',
            'message'    => "{$this->authorName} praised you{$badgeText}: \"{$this->postContent}\"",
            'badge'      => $this->badgeName,
            'post_id'    => $this->postId,
            'action_url' => '/community',
        ];
    }
}
