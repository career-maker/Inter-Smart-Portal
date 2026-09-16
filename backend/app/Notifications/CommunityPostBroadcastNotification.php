<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class CommunityPostBroadcastNotification extends Notification
{
    protected string $authorName;
    protected string $content;
    protected string $type;
    protected int $postId;

    public function __construct(string $authorName, string $content, string $type, int $postId)
    {
        $this->authorName = $authorName;
        $this->content    = $content;
        $this->type       = $type;
        $this->postId     = $postId;
    }

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        $snippet = mb_strlen($this->content) > 60
            ? mb_substr($this->content, 0, 57) . '...'
            : $this->content;

        if ($this->type === 'praise') {
            $title   = 'New Praise!';
            $message = "{$this->authorName} shared a praise: \"{$snippet}\"";
        } elseif ($this->type === 'poll') {
            $title   = 'New Community Poll';
            $message = "{$this->authorName} started a poll: \"{$snippet}\"";
        } else {
            $title   = 'New Community Post';
            $message = "{$this->authorName} shared a new post: \"{$snippet}\"";
        }

        return [
            'title'      => $title,
            'message'    => $message,
            'post_id'    => $this->postId,
            'action_url' => '/community',
        ];
    }
}
