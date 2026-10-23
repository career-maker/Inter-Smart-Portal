<?php

namespace App\Support;

use App\Models\User;
use App\Notifications\AccountsNotification;

/** Send one in-app notification to several people, never to the person who did the action. */
class Notify
{
    public static function users($users, string $title, string $message, string $event, ?int $projectId, ?User $actor = null): void
    {
        foreach (collect($users)->filter()->unique('id')->reject(fn ($u) => $actor && $u->id === $actor->id) as $user) {
            try {
                $user->notify(new AccountsNotification($title, $message, $event, $projectId));
            } catch (\Throwable $e) {
                \Log::warning('Notification failed: ' . $e->getMessage());
            }
        }
    }
}
