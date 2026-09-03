<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\ChatMessage;
use App\Models\ChatMessageAttachment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class DirectChatController extends Controller
{
    /**
     * Check if user is Super Admin.
     */
    private function isSuperAdmin($user): bool
    {
        if (!$user) return false;
        return $user->role === 'Super Admin' || 
               (method_exists($user, 'hasRole') && $user->hasRole('Super Admin')) ||
               (bool)($user->is_super_admin ?? false);
    }

    /**
     * Get IDs of users who have been active recently (strictly within last 2 minutes).
     */
    private function getActiveUserIds(): array
    {
        try {
            $cutoff = Carbon::now()->subMinutes(2);
            $tokenUserIds = DB::table('personal_access_tokens')
                ->where(function ($q) {
                    $q->where('tokenable_type', User::class)
                      ->orWhere('tokenable_type', 'App\\Models\\User')
                      ->orWhere('tokenable_type', 'User');
                })
                ->where('last_used_at', '>=', $cutoff)
                ->pluck('tokenable_id')
                ->toArray();

            return array_map('intval', array_unique($tokenUserIds));
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Heartbeat endpoint for active chat users.
     */
    public function heartbeat(Request $request)
    {
        $user = $request->user();
        if ($user) {
            $user->currentAccessToken()?->update(['last_used_at' => Carbon::now()]);
        }

        return response()->json([
            'status' => 'success',
            'online_user_ids' => $this->getActiveUserIds(),
        ]);
    }

    /**
     * Format a user object for chat response with online status.
     */
    private function formatUser($user, $activeUserIds = null): ?array
    {
        if (!$user) return null;
        
        $photoUrl = null;
        if ($user->profile_photo_path) {
            $photoUrl = str_starts_with($user->profile_photo_path, 'http')
                ? $user->profile_photo_path
                : url('api/photos/' . ltrim($user->profile_photo_path, '/'));
        }

        $isOnline = false;
        if ($activeUserIds !== null) {
            $isOnline = in_array((int)$user->id, $activeUserIds, true);
        }

        return [
            'id' => $user->id,
            'name' => "{$user->first_name} {$user->last_name}",
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'designation' => $user->designation ?? 'Employee',
            'department' => $user->team ? $user->team->name : ($user->department ?? null),
            'employee_code' => $user->employee_code,
            'profile_photo_path' => $photoUrl,
            'role' => $user->role,
            'is_online' => $isOnline,
        ];
    }

    /**
     * Format an attachment object with a full accessible URL.
     */
    private function formatAttachment($att): array
    {
        $url = str_starts_with($att->file_path, 'http')
            ? $att->file_path
            : url('storage/' . ltrim($att->file_path, '/'));

        return [
            'id' => $att->id,
            'file_path' => $att->file_path,
            'file_url' => $url,
            'original_name' => $att->original_name,
            'file_type' => $att->file_type,
            'file_size' => $att->file_size,
            'created_at' => $att->created_at?->toISOString(),
        ];
    }

    /**
     * Format a message for response with WhatsApp-style read receipt status.
     */
    private function formatMessage($msg, $otherLastReadAt = null): array
    {
        $isRead = false;
        if ($otherLastReadAt && $msg->created_at) {
            $msgCreated = Carbon::parse($msg->created_at);
            $readTime = Carbon::parse($otherLastReadAt);
            if ($readTime->gte($msgCreated)) {
                $isRead = true;
            }
        }

        return [
            'id' => $msg->id,
            'conversation_id' => $msg->conversation_id,
            'sender_id' => $msg->sender_id,
            'sender' => $this->formatUser($msg->sender),
            'message' => $msg->message,
            'message_type' => $msg->message_type,
            'is_edited' => (bool)$msg->is_edited,
            'is_deleted' => (bool)$msg->is_deleted,
            'is_read' => $isRead,
            'attachments' => $msg->attachments ? $msg->attachments->map(fn($a) => $this->formatAttachment($a))->values() : [],
            'created_at' => $msg->created_at?->toISOString(),
            'updated_at' => $msg->updated_at?->toISOString(),
        ];
    }

    /**
     * List all conversations for the authenticated user.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $activeUserIds = $this->getActiveUserIds();

        $participants = ConversationParticipant::where('user_id', $user->id)
            ->where('is_archived', false)
            ->with([
                'conversation.participants.user.team',
                'conversation.latestMessage.sender',
                'conversation.latestMessage.attachments',
            ])
            ->get();

        $conversations = $participants->map(function ($p) use ($user, $activeUserIds) {
            $conv = $p->conversation;
            if (!$conv) return null;

            $otherParticipants = $conv->participants
                ->filter(fn($cp) => $cp->user_id !== $user->id)
                ->map(fn($cp) => $this->formatUser($cp->user, $activeUserIds))
                ->values();

            $otherUser = $otherParticipants->first();

            // Calculate unread count for current user
            $lastRead = $p->last_read_at;
            $unreadQuery = ChatMessage::where('conversation_id', $conv->id)
                ->where('sender_id', '!=', $user->id)
                ->where('is_deleted', false);

            if ($lastRead) {
                $unreadQuery->where('created_at', '>', $lastRead);
            }
            $unreadCount = $unreadQuery->count();

            $latestMsg = $conv->latestMessage ? $this->formatMessage($conv->latestMessage) : null;

            return [
                'id' => $conv->id,
                'type' => $conv->type,
                'title' => $conv->title ?: ($otherUser ? $otherUser['name'] : 'Conversation'),
                'other_user' => $otherUser,
                'participants' => $conv->participants->map(fn($cp) => $this->formatUser($cp->user))->values(),
                'latest_message' => $latestMsg,
                'unread_count' => $unreadCount,
                'last_message_at' => $conv->last_message_at ? $conv->last_message_at->toISOString() : $conv->created_at?->toISOString(),
                'is_pinned' => (bool)$p->is_pinned,
                'is_muted' => (bool)$p->is_muted,
                'created_at' => $conv->created_at?->toISOString(),
            ];
        })->filter()->sortByDesc('last_message_at')->values();

        return response()->json([
            'status' => 'success',
            'data' => $conversations,
        ]);
    }

    /**
     * Find or create a 1-on-1 direct conversation with a target employee.
     */
    public function startOrGetDirectConversation(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $validated = $request->validate([
            'target_user_id' => 'required|integer|exists:users,id',
        ]);

        $targetUserId = (int)$validated['target_user_id'];
        if ($targetUserId === $user->id) {
            return response()->json(['message' => 'Cannot start a direct conversation with yourself.'], 422);
        }

        // Find existing direct conversation shared by both users
        $existingConv = Conversation::where('type', 'direct')
            ->whereHas('participants', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            })
            ->whereHas('participants', function ($q) use ($targetUserId) {
                $q->where('user_id', $targetUserId);
            })
            ->first();

        if ($existingConv) {
            $otherUser = User::with('team')->find($targetUserId);
            $latestMsg = $existingConv->latestMessage ? $this->formatMessage($existingConv->latestMessage) : null;
            return response()->json([
                'status' => 'success',
                'data' => [
                    'id' => $existingConv->id,
                    'type' => $existingConv->type,
                    'title' => $otherUser ? "{$otherUser->first_name} {$otherUser->last_name}" : 'Conversation',
                    'other_user' => $this->formatUser($otherUser),
                    'participants' => [
                        $this->formatUser($user),
                        $this->formatUser($otherUser),
                    ],
                    'latest_message' => $latestMsg,
                    'unread_count' => 0,
                    'last_message_at' => $existingConv->last_message_at ? $existingConv->last_message_at->toISOString() : $existingConv->created_at?->toISOString(),
                    'created_at' => $existingConv->created_at?->toISOString(),
                ],
                'is_new' => false,
            ]);
        }

        // Create new direct conversation
        $conversation = DB::transaction(function () use ($user, $targetUserId) {
            $conv = Conversation::create([
                'type' => 'direct',
                'created_by' => $user->id,
                'last_message_at' => Carbon::now(),
            ]);

            ConversationParticipant::create([
                'conversation_id' => $conv->id,
                'user_id' => $user->id,
                'last_read_at' => Carbon::now(),
            ]);

            ConversationParticipant::create([
                'conversation_id' => $conv->id,
                'user_id' => $targetUserId,
                'last_read_at' => null,
            ]);

            return $conv;
        });

        $targetUser = User::with('team')->find($targetUserId);

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $conversation->id,
                'type' => $conversation->type,
                'title' => $targetUser ? "{$targetUser->first_name} {$targetUser->last_name}" : 'Conversation',
                'other_user' => $this->formatUser($targetUser),
                'participants' => [
                    $this->formatUser($user),
                    $this->formatUser($targetUser),
                ],
                'latest_message' => null,
                'unread_count' => 0,
                'last_message_at' => Carbon::now()->toISOString(),
                'created_at' => $conversation->created_at?->toISOString(),
            ],
            'is_new' => true,
        ], 201);
    }

    /**
     * Search employees by name, email, or department to start a new chat.
     */
    public function searchUsers(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $q = trim($request->input('q', ''));
        
        $usersQuery = User::with('team')
            ->where('id', '!=', $user->id)
            ->where('status', '!=', 'Terminated');

        if ($q !== '') {
            $usersQuery->where(function ($sq) use ($q) {
                $sq->where('first_name', 'like', "%{$q}%")
                   ->orWhere('last_name', 'like', "%{$q}%")
                   ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$q}%"])
                   ->orWhere('email', 'like', "%{$q}%")
                   ->orWhere('employee_code', 'like', "%{$q}%")
                   ->orWhere('designation', 'like', "%{$q}%")
                   ->orWhereHas('team', function ($tq) use ($q) {
                       $tq->where('name', 'like', "%{$q}%");
                   });
            });
        }

        $activeUserIds = $this->getActiveUserIds();
        $users = $usersQuery->orderBy('first_name')->take(50)->get();

        return response()->json([
            'status' => 'success',
            'data' => $users->map(fn($u) => $this->formatUser($u, $activeUserIds))->values(),
        ]);
    }

    /**
     * Fetch messages for a conversation.
     */
    public function getMessages(Request $request, Conversation $conversation)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $isParticipant = $conversation->participants()->where('user_id', $user->id)->exists();
        $isSuperAdmin = $this->isSuperAdmin($user);

        if (!$isParticipant && !$isSuperAdmin) {
            return response()->json(['message' => 'Unauthorized to view this conversation.'], 403);
        }

        // Mark as read for this participant
        if ($isParticipant) {
            ConversationParticipant::where('conversation_id', $conversation->id)
                ->where('user_id', $user->id)
                ->update(['last_read_at' => Carbon::now()]);
        }

        $messages = ChatMessage::where('conversation_id', $conversation->id)
            ->where('is_deleted', false)
            ->with(['sender.team', 'attachments'])
            ->orderBy('created_at', 'asc')
            ->get();

        $activeUserIds = $this->getActiveUserIds();

        // Get participant info and other participant's last_read_at
        $otherParticipant = $conversation->participants()
            ->where('user_id', '!=', $user->id)
            ->with('user.team')
            ->first();

        $otherLastReadAt = $otherParticipant ? $otherParticipant->last_read_at : null;

        return response()->json([
            'status' => 'success',
            'conversation' => [
                'id' => $conversation->id,
                'type' => $conversation->type,
                'other_user' => $otherParticipant ? $this->formatUser($otherParticipant->user, $activeUserIds) : null,
            ],
            'data' => $messages->map(fn($m) => $this->formatMessage($m, $otherLastReadAt))->values(),
        ]);
    }

    /**
     * Send a message in a conversation with optional attachments or screenshot images.
     */
    public function sendMessage(Request $request, Conversation $conversation)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $isParticipant = $conversation->participants()->where('user_id', $user->id)->exists();
        if (!$isParticipant) {
            return response()->json(['message' => 'You are not a participant in this conversation.'], 403);
        }

        $request->validate([
            'message' => 'nullable|string',
            'attachments.*' => 'nullable|file|max:5120', // 5MB limit
        ], [
            'attachments.*.max' => 'Attachment exceeds the maximum allowed size of 5 MB.',
        ]);

        $messageText = trim($request->input('message', ''));
        $hasFiles = $request->hasFile('attachments');

        if ($messageText === '' && !$hasFiles) {
            return response()->json(['message' => 'Please provide a message or an attachment.'], 422);
        }

        $messageType = 'text';
        if ($hasFiles && $messageText === '') {
            $files = $request->file('attachments');
            $firstFile = is_array($files) ? ($files[0] ?? null) : $files;
            $mime = $firstFile ? $firstFile->getMimeType() : '';
            $messageType = str_starts_with($mime, 'image/') ? 'image' : 'file';
        }

        $chatMessage = DB::transaction(function () use ($request, $conversation, $user, $messageText, $messageType, $hasFiles) {
            $msg = ChatMessage::create([
                'conversation_id' => $conversation->id,
                'sender_id' => $user->id,
                'message' => $messageText !== '' ? $messageText : null,
                'message_type' => $messageType,
            ]);

            if ($hasFiles) {
                $files = $request->file('attachments');
                if (!is_array($files)) {
                    $files = [$files];
                }

                foreach ($files as $file) {
                    if (!$file || !$file->isValid()) continue;

                    $originalName = $file->getClientOriginalName();
                    $mimeType = $file->getMimeType();
                    $fileSize = $file->getSize();
                    
                    // Store on public disk in chat_attachments directory
                    $path = $file->store("chat_attachments/{$conversation->id}", 'public');

                    ChatMessageAttachment::create([
                        'message_id' => $msg->id,
                        'file_path' => $path,
                        'original_name' => $originalName,
                        'file_type' => $mimeType,
                        'file_size' => $fileSize,
                    ]);
                }
            }

            // Update conversation last_message_at
            $conversation->update(['last_message_at' => Carbon::now()]);

            // Update sender's last_read_at
            ConversationParticipant::where('conversation_id', $conversation->id)
                ->where('user_id', $user->id)
                ->update(['last_read_at' => Carbon::now()]);

            return $msg;
        });

        $chatMessage->load(['sender.team', 'attachments']);

        return response()->json([
            'status' => 'success',
            'data' => $this->formatMessage($chatMessage),
        ], 201);
    }

    /**
     * Mark a conversation as read.
     */
    public function markAsRead(Request $request, Conversation $conversation)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        ConversationParticipant::where('conversation_id', $conversation->id)
            ->where('user_id', $user->id)
            ->update(['last_read_at' => Carbon::now()]);

        return response()->json(['status' => 'success']);
    }

    /**
     * Super Admin: View all conversations across all employees.
     */
    public function adminGetAllConversations(Request $request)
    {
        $user = $request->user();
        if (!$this->isSuperAdmin($user)) {
            return response()->json(['message' => 'Super Admin access required.'], 403);
        }

        $search = trim($request->input('q', ''));

        $query = Conversation::with([
            'participants.user.team',
            'latestMessage.sender',
            'latestMessage.attachments',
        ])
        ->withCount('messages');

        if ($search !== '') {
            $query->whereHas('participants.user', function ($uq) use ($search) {
                $uq->where('first_name', 'like', "%{$search}%")
                   ->orWhere('last_name', 'like', "%{$search}%")
                   ->orWhere('email', 'like', "%{$search}%")
                   ->orWhere('employee_code', 'like', "%{$search}%");
            });
        }

        $conversations = $query->orderByDesc('last_message_at')->get();

        $data = $conversations->map(function ($conv) {
            $participants = $conv->participants->map(fn($cp) => $this->formatUser($cp->user))->values();
            $latestMsg = $conv->latestMessage ? $this->formatMessage($conv->latestMessage) : null;

            return [
                'id' => $conv->id,
                'type' => $conv->type,
                'participants' => $participants,
                'total_messages' => $conv->messages_count,
                'latest_message' => $latestMsg,
                'last_message_at' => $conv->last_message_at ? $conv->last_message_at->toISOString() : $conv->created_at?->toISOString(),
                'created_at' => $conv->created_at?->toISOString(),
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * Super Admin: View full conversation history for any conversation.
     */
    public function adminGetConversationHistory(Request $request, Conversation $conversation)
    {
        $user = $request->user();
        if (!$this->isSuperAdmin($user)) {
            return response()->json(['message' => 'Super Admin access required.'], 403);
        }

        $conversation->load('participants.user.team');

        $messages = ChatMessage::where('conversation_id', $conversation->id)
            ->with(['sender.team', 'attachments'])
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json([
            'status' => 'success',
            'conversation' => [
                'id' => $conversation->id,
                'type' => $conversation->type,
                'participants' => $conversation->participants->map(fn($cp) => $this->formatUser($cp->user))->values(),
                'created_at' => $conversation->created_at?->toISOString(),
            ],
            'data' => $messages->map(fn($m) => $this->formatMessage($m))->values(),
        ]);
    }

    /**
     * Super Admin: Delete all message history in an individual conversation.
     */
    public function adminClearConversationHistory(Request $request, Conversation $conversation)
    {
        $user = $request->user();
        if (!$this->isSuperAdmin($user)) {
            return response()->json(['message' => 'Super Admin access required.'], 403);
        }

        $messageIds = ChatMessage::where('conversation_id', $conversation->id)->pluck('id');
        $deletedCount = count($messageIds);

        if ($deletedCount > 0) {
            // Delete physical attachment files
            $attachments = ChatMessageAttachment::whereIn('message_id', $messageIds)->get();
            foreach ($attachments as $att) {
                if ($att->file_path && Storage::disk('public')->exists($att->file_path)) {
                    Storage::disk('public')->delete($att->file_path);
                }
            }
            ChatMessageAttachment::whereIn('message_id', $messageIds)->delete();
            ChatMessage::whereIn('id', $messageIds)->delete();
        }

        return response()->json([
            'status' => 'success',
            'message' => "Successfully cleared {$deletedCount} messages from conversation.",
        ]);
    }

    /**
     * Super Admin: Delete an individual message from conversation.
     */
    public function adminDeleteMessage(Request $request, ChatMessage $message)
    {
        $user = $request->user();
        if (!$this->isSuperAdmin($user)) {
            return response()->json(['message' => 'Super Admin access required.'], 403);
        }

        // Delete attachments if any
        $attachments = ChatMessageAttachment::where('message_id', $message->id)->get();
        foreach ($attachments as $att) {
            if ($att->file_path && Storage::disk('public')->exists($att->file_path)) {
                Storage::disk('public')->delete($att->file_path);
            }
        }
        ChatMessageAttachment::where('message_id', $message->id)->delete();
        $message->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Message deleted successfully.',
        ]);
    }
}
