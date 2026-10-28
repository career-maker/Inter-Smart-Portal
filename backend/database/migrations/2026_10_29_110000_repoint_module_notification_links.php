<?php

use App\Models\User;
use App\Support\NotificationLink;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Module notifications already sent all pointed at /project-management/projects. Re-point each to the page of its own module.
 * Only the link inside the notification's data changes; nothing is added or removed. Not reversible (the old link was wrong).
 */
return new class extends Migration
{
    public function up(): void
    {
        $users = [];
        DB::table('notifications')->where('type', 'App\\Notifications\\AccountsNotification')->orderBy('created_at')->chunk(200, function ($rows) use (&$users) {
            foreach ($rows as $n) {
                $d = json_decode($n->data, true);
                if (! is_array($d) || ($d['action_url'] ?? null) !== '/project-management/projects') {
                    continue;
                }
                $users[$n->notifiable_id] ??= User::with('team')->find($n->notifiable_id);
                $d['action_url'] = NotificationLink::for((string) ($d['event'] ?? ''), $d['project_id'] ?? null, $users[$n->notifiable_id]);
                DB::table('notifications')->where('id', $n->id)->update(['data' => json_encode($d)]);
            }
        });
    }

    public function down(): void
    {
    }
};
