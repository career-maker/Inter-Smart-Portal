<?php

namespace App\Services;

use App\Models\ChatMessage;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\PushSubscription;
use Illuminate\Support\Facades\Log;

/**
 * Sends a browser/phone push for a new chat message to every other member of the conversation.
 * Never throws: a push problem must not break sending a chat message.
 */
class ChatPushNotifier
{
    public function notify(Conversation $conversation, ChatMessage $message, $sender): void
    {
        try {
            if (!class_exists(\Minishlink\WebPush\WebPush::class) || !config('webpush.public_key') || !config('webpush.private_key')) {
                return;
            }

            $recipientIds = ConversationParticipant::where('conversation_id', $conversation->id)
                ->where('user_id', '!=', $sender->id)
                ->where('is_muted', false)
                ->pluck('user_id');
            if ($recipientIds->isEmpty()) {
                return;
            }

            $subscriptions = PushSubscription::whereIn('user_id', $recipientIds)->get();
            if ($subscriptions->isEmpty()) {
                return;
            }

            $name = trim("{$sender->first_name} {$sender->last_name}");
            $isGroup = $conversation->type === 'group';
            $payload = json_encode([
                'title' => $isGroup ? "{$name} in {$conversation->title}" : $name,
                'body' => $this->preview($message),
                'url' => '/chat?conversationId=' . $conversation->id,
                'tag' => 'chat_' . $conversation->id,
            ]);

            $webPush = new \Minishlink\WebPush\WebPush([
                'VAPID' => [
                    'subject' => config('webpush.subject'),
                    'publicKey' => config('webpush.public_key'),
                    'privateKey' => config('webpush.private_key'),
                ],
            ], ['TTL' => 3600, 'urgency' => 'high']);

            foreach ($subscriptions as $s) {
                $webPush->queueNotification(
                    \Minishlink\WebPush\Subscription::create([
                        'endpoint' => $s->endpoint,
                        'keys' => ['p256dh' => $s->p256dh, 'auth' => $s->auth],
                        'contentEncoding' => $s->content_encoding ?: 'aes128gcm',
                    ]),
                    $payload
                );
            }

            foreach ($webPush->flush() as $report) {
                // 404 / 410 mean the browser unsubscribed: forget it
                if ($report->isSubscriptionExpired()) {
                    PushSubscription::where('endpoint_hash', hash('sha256', $report->getEndpoint()))->delete();
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Chat push failed: ' . $e->getMessage());
        }
    }

    private function preview(ChatMessage $message): string
    {
        if ($message->message_type === 'sticker') {
            return 'Sent a sticker';
        }
        $text = trim((string) $message->message);
        if ($text !== '') {
            return mb_strimwidth($text, 0, 120, '...');
        }
        if ($message->message_type === 'audio') {
            return 'Sent a voice note';
        }

        return $message->message_type === 'image' ? 'Sent a photo' : 'Sent an attachment';
    }
}
