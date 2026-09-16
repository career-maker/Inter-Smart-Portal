<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class CommunityEngagementNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $actorName,
        public string $engagementType, // 'reaction', 'comment', 'poll_vote'
        public string $postType,       // 'post', 'praise', 'poll'
        public int $postId,
        public ?string $detail = null  // reaction type or comment snippet
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        $postLabel = match ($this->postType) {
            'poll'   => 'poll',
            'praise' => 'praise',
            default  => 'post',
        };

        if ($this->engagementType === 'reaction') {
            $reactionEmoji = match ($this->detail) {
                'heart' => '❤️',
                'clap'  => '👏',
                'idea'  => '💡',
                'think' => '🤔',
                'smile' => '😊',
                default => '👍',
            };
            $title = "New Reaction {$reactionEmoji}";
            $message = "{$this->actorName} reacted {$reactionEmoji} to your {$postLabel}.";
        } elseif ($this->engagementType === 'comment') {
            $title = "New Comment 💬";
            $preview = $this->detail ? (mb_strlen($this->detail) > 60 ? mb_substr($this->detail, 0, 57) . '...' : $this->detail) : '';
            $message = $preview
                ? "{$this->actorName} commented on your {$postLabel}: \"{$preview}\""
                : "{$this->actorName} commented on your {$postLabel}.";
        } elseif ($this->engagementType === 'poll_vote') {
            $title = "New Vote on Poll 📊";
            $message = "{$this->actorName} voted on your poll.";
        } else {
            $title = "New Engagement";
            $message = "{$this->actorName} engaged with your {$postLabel}.";
        }

        return [
            'type'            => 'community_engagement',
            'title'           => $title,
            'message'         => $message,
            'post_id'         => $this->postId,
            'action_url'      => '/community',
            'engagement_type' => $this->engagementType,
            'actor_name'      => $this->actorName,
        ];
    }
}
