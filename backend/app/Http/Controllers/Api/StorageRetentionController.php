<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Models\ChatMessageAttachment;
use App\Models\CommunityPost;
use App\Models\CommunityPostComment;
use App\Models\CommunityPostLike;
use App\Models\SystemSetting;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class StorageRetentionController extends Controller
{
    private function isSuperAdmin($user): bool
    {
        if (!$user) return false;
        if (method_exists($user, 'hasRole') && $user->hasRole('Super Admin')) return true;
        $roleStr = strtolower($user->role ?? '');
        return $roleStr === 'super admin' || $roleStr === 'admin';
    }

    /**
     * Get storage retention settings and statistics.
     */
    public function getSettings(Request $request)
    {
        $user = $request->user();
        if (!$this->isSuperAdmin($user)) {
            return response()->json(['message' => 'Super Admin access required.'], 403);
        }

        $chatDays = (int) (SystemSetting::where('key', 'chat_retention_days')->value('value') ?? 30);
        $postDays = (int) (SystemSetting::where('key', 'community_posts_retention_days')->value('value') ?? 30);
        $autoCleanup = (bool) (SystemSetting::where('key', 'storage_auto_cleanup_enabled')->value('value') ?? true);
        $lastCleanup = SystemSetting::where('key', 'storage_last_cleanup_at')->value('value');

        // Calculate statistics
        $totalChatMessages = ChatMessage::count();
        $chatCutoff = Carbon::now()->subDays($chatDays);
        $eligibleChatMessages = ChatMessage::where('created_at', '<', $chatCutoff)->count();

        $totalPosts = CommunityPost::count();
        $postCutoff = Carbon::now()->subDays($postDays);
        $eligiblePosts = CommunityPost::where('created_at', '<', $postCutoff)->count();

        // Calculate total chat attachment size
        $totalChatAttachmentBytes = (int) ChatMessageAttachment::sum('file_size');
        $chatAttachmentMb = round($totalChatAttachmentBytes / (1024 * 1024), 2);

        return response()->json([
            'status' => 'success',
            'data' => [
                'chat_retention_days' => $chatDays,
                'community_posts_retention_days' => $postDays,
                'auto_cleanup_enabled' => $autoCleanup,
                'last_cleanup_at' => $lastCleanup,
                'stats' => [
                    'total_chat_messages' => $totalChatMessages,
                    'eligible_chat_messages' => $eligibleChatMessages,
                    'chat_retention_cutoff' => $chatCutoff->toFormattedDateString(),
                    'total_community_posts' => $totalPosts,
                    'eligible_community_posts' => $eligiblePosts,
                    'community_posts_cutoff' => $postCutoff->toFormattedDateString(),
                    'chat_attachments_size_mb' => $chatAttachmentMb,
                ]
            ]
        ]);
    }

    /**
     * Save retention settings.
     */
    public function saveSettings(Request $request)
    {
        $user = $request->user();
        if (!$this->isSuperAdmin($user)) {
            return response()->json(['message' => 'Super Admin access required.'], 403);
        }

        $validated = $request->validate([
            'chat_retention_days' => 'required|integer|min:1|max:365',
            'community_posts_retention_days' => 'required|integer|min:1|max:365',
            'auto_cleanup_enabled' => 'required|boolean',
        ]);

        SystemSetting::updateOrCreate(
            ['key' => 'chat_retention_days'],
            ['value' => (string) $validated['chat_retention_days']]
        );

        SystemSetting::updateOrCreate(
            ['key' => 'community_posts_retention_days'],
            ['value' => (string) $validated['community_posts_retention_days']]
        );

        SystemSetting::updateOrCreate(
            ['key' => 'storage_auto_cleanup_enabled'],
            ['value' => $validated['auto_cleanup_enabled'] ? '1' : '0']
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Storage retention settings saved successfully.',
        ]);
    }

    /**
     * Perform on-demand cleanup of expired chat messages and community posts.
     */
    public function cleanupNow(Request $request)
    {
        $user = $request->user();
        if (!$this->isSuperAdmin($user)) {
            return response()->json(['message' => 'Super Admin access required.'], 403);
        }

        $chatDays = (int) (SystemSetting::where('key', 'chat_retention_days')->value('value') ?? 30);
        $postDays = (int) (SystemSetting::where('key', 'community_posts_retention_days')->value('value') ?? 30);

        $result = $this->executeCleanup($chatDays, $postDays);

        SystemSetting::updateOrCreate(
            ['key' => 'storage_last_cleanup_at'],
            ['value' => Carbon::now()->toISOString()]
        );

        return response()->json([
            'status' => 'success',
            'message' => "Cleanup completed: {$result['deleted_chat_messages']} chat messages and {$result['deleted_posts']} community posts deleted.",
            'data' => $result,
        ]);
    }

    /**
     * Execute retention cleanup logic.
     */
    public function executeCleanup(int $chatDays, int $postDays): array
    {
        $chatCutoff = Carbon::now()->subDays($chatDays);
        $postCutoff = Carbon::now()->subDays($postDays);

        // 1. Delete Expired Chat Messages & Attachments
        $expiredMessageIds = ChatMessage::where('created_at', '<', $chatCutoff)->pluck('id');
        $deletedChatCount = count($expiredMessageIds);

        if ($deletedChatCount > 0) {
            $attachments = ChatMessageAttachment::whereIn('message_id', $expiredMessageIds)->get();
            foreach ($attachments as $att) {
                if ($att->file_path && Storage::disk('public')->exists($att->file_path)) {
                    Storage::disk('public')->delete($att->file_path);
                }
            }
            ChatMessageAttachment::whereIn('message_id', $expiredMessageIds)->delete();
            ChatMessage::whereIn('id', $expiredMessageIds)->delete();
        }

        // 2. Delete Expired Community Posts & Media
        $expiredPosts = CommunityPost::where('created_at', '<', $postCutoff)->get();
        $deletedPostCount = $expiredPosts->count();

        if ($deletedPostCount > 0) {
            foreach ($expiredPosts as $post) {
                if ($post->media_url) {
                    $mediaPath = str_replace('/storage/', '', parse_url($post->media_url, PHP_URL_PATH));
                    if ($mediaPath && Storage::disk('public')->exists($mediaPath)) {
                        Storage::disk('public')->delete($mediaPath);
                    }
                }
            }
            $expiredPostIds = $expiredPosts->pluck('id');
            CommunityPostLike::whereIn('post_id', $expiredPostIds)->delete();
            CommunityPostComment::whereIn('post_id', $expiredPostIds)->delete();
            CommunityPost::whereIn('id', $expiredPostIds)->delete();
        }

        return [
            'deleted_chat_messages' => $deletedChatCount,
            'deleted_posts' => $deletedPostCount,
            'timestamp' => Carbon::now()->toISOString(),
        ];
    }
}
