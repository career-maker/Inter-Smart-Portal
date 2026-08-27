<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PostMentionNotification extends Notification
{
    use Queueable;

    protected $authorName;
    protected $postId;
    protected $type;

    public function __construct($authorName, $postId, $type)
    {
        $this->authorName = $authorName;
        $this->postId = $postId;
        $this->type = $type;
    }

    public function via($notifiable)
    {
        return ['database'];
    }

    public function toDatabase($notifiable)
    {
        $typeLabel = $this->type === 'praise' ? 'praise' : ($this->type === 'poll' ? 'poll' : 'community post');
        
        return [
            'type' => 'mention',
            'title' => 'You were mentioned',
            'message' => "{$this->authorName} mentioned you in a {$typeLabel}.",
            'post_id' => $this->postId,
        ];
    }
}
