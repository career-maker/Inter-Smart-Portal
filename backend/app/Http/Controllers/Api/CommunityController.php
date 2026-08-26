<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\CommunityPost;
use App\Models\CommunityPostLike;
use App\Models\CommunityPostComment;
use App\Models\User;
use App\Models\Holiday;
use App\Models\LeaveRequest;
use App\Models\WfhRequest;
use App\Models\LeaveBalance;
use App\Models\Project;
use App\Notifications\PraiseReceivedNotification;
use App\Notifications\PollNotification;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

class CommunityController extends Controller
{
    private function isSuperAdmin($user): bool
    {
        if (!$user) return false;
        if (isset($user->role) && strtolower($user->role) === 'super admin') return true;
        if (method_exists($user, 'hasRole') && $user->hasRole('Super Admin')) return true;
        if (!empty($user->roles) && $user->roles->contains('name', 'Super Admin')) return true;
        return false;
    }

    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $query = CommunityPost::with([
            'user:id,first_name,last_name,email,designation,profile_photo_path',
            'comments.user:id,first_name,last_name,designation,profile_photo_path'
        ])
            ->withCount('likes')
            ->withCount('comments');

        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        if ($request->filled('year') && $request->year !== 'all') {
            $query->whereYear('created_at', $request->year);
        }

        if ($request->filled('month') && $request->month !== 'all') {
            $query->whereMonth('created_at', $request->month);
        }

        if ($request->filled('date')) {
            $query->whereDate('created_at', $request->date);
        }

        $perPage = $request->input('per_page', 10);
        $posts = $query->orderBy('pinned', 'desc')
            ->latest()
            ->paginate($perPage);

        $postIds = $posts->pluck('id')->toArray();
        $userLikedPostIds = CommunityPostLike::where('user_id', $userId)
            ->whereIn('post_id', $postIds)
            ->pluck('post_id')
            ->toArray();

        // Collect all praised user IDs to eager load in one query
        $allPraisedUserIds = [];
        foreach ($posts as $p) {
            if ($p->type === 'praise' && !empty($p->poll_data)) {
                if (!empty($p->poll_data['praised_user_ids']) && is_array($p->poll_data['praised_user_ids'])) {
                    foreach ($p->poll_data['praised_user_ids'] as $uId) {
                        $allPraisedUserIds[] = (int)$uId;
                    }
                } elseif (!empty($p->poll_data['praised_user_id'])) {
                    $allPraisedUserIds[] = (int)$p->poll_data['praised_user_id'];
                }
            }
        }

        $praisedUsersMap = [];
        if (!empty($allPraisedUserIds)) {
            $praisedUsersMap = User::select('id', 'first_name', 'last_name', 'designation', 'profile_photo_path')
                ->whereIn('id', array_unique($allPraisedUserIds))
                ->get()
                ->keyBy('id');
        }

        $posts->getCollection()->transform(function ($post) use ($userLikedPostIds, $userId, $praisedUsersMap) {
            $post->user_has_liked = in_array($post->id, $userLikedPostIds);
            if ($post->user) {
                $post->user->profile_photo_path = $post->user->profilePhotoUrl();
            }
            if ($post->comments) {
                foreach ($post->comments as $cmt) {
                    if ($cmt->user) {
                        $cmt->user->profile_photo_path = $cmt->user->profilePhotoUrl();
                    }
                }
            }
            
            if ($post->type === 'poll' && !empty($post->poll_data['options'])) {
                $userVotedOptionId = null;
                foreach ($post->poll_data['options'] as $opt) {
                    if (!empty($opt['voter_ids']) && in_array($userId, $opt['voter_ids'])) {
                        $userVotedOptionId = $opt['id'];
                        break;
                    }
                }
                $post->user_voted_option_id = $userVotedOptionId;
            }

            if ($post->type === 'praise' && !empty($post->poll_data)) {
                $recipients = [];
                if (!empty($post->poll_data['praised_user_ids']) && is_array($post->poll_data['praised_user_ids'])) {
                    foreach ($post->poll_data['praised_user_ids'] as $uId) {
                        if (isset($praisedUsersMap[$uId])) {
                            $recipients[] = (function($u) { $u->profile_photo_path = $u->profilePhotoUrl(); return $u; })($praisedUsersMap[$uId]);
                        }
                    }
                } elseif (!empty($post->poll_data['praised_user_id']) && isset($praisedUsersMap[$post->poll_data['praised_user_id']])) {
                    $recipients[] = $praisedUsersMap[$post->poll_data['praised_user_id']];
                }
                $post->praised_users = $recipients;
                $post->praised_user = $recipients[0] ?? null;
            }

            if ($post->media_url && !str_starts_with($post->media_url, 'http')) {
                $post->media_url = url($post->media_url);
            }
            return $post;
        });

        return response()->json($posts);
    }

    public function store(Request $request)
    {
        $request->validate([
            'content' => 'required|string|max:5000',
            'type' => 'nullable|string|in:post,praise,poll',
            'media_url' => 'nullable|string',
            'image' => 'nullable|image|max:10240',
            'options' => 'nullable|array',
            'expires_at' => 'nullable|date',
            'is_anonymous' => 'nullable|boolean',
            'notify_employees' => 'nullable|boolean',
            'praised_user_id' => 'nullable|integer',
            'praised_user_ids' => 'nullable',
            'badge' => 'nullable|string',
            'project_name' => 'nullable|string',
        ]);

        $mediaUrl = $request->input('media_url');

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('community', 'public');
            $mediaUrl = '/storage/' . $path;
        }

        $type = $request->input('type', 'post');
        $pollData = null;
        $currentUser = $request->user();

        if ($type === 'poll') {
            $rawOptions = $request->input('options', []);
            $filtered = [];
            foreach ($rawOptions as $idx => $opt) {
                $trimmed = trim(is_array($opt) ? ($opt['text'] ?? '') : (string)$opt);
                if (!empty($trimmed)) {
                    $filtered[] = [
                        'id' => count($filtered) + 1,
                        'text' => $trimmed,
                        'votes' => 0,
                        'voter_ids' => [],
                    ];
                }
            }

            if (count($filtered) < 2) {
                return response()->json(['message' => 'A poll must have at least 2 options.'], 422);
            }

            $pollData = [
                'options' => $filtered,
                'expires_at' => $request->input('expires_at') ?: Carbon::now()->addDays(7)->format('Y-m-d'),
                'is_anonymous' => (bool)$request->input('is_anonymous', false),
                'total_votes' => 0,
            ];
        } elseif ($type === 'praise') {
            $badge = $request->input('badge');
            $projectName = $request->input('project_name');

            // Handle multiple praised employees
            $praisedUserIds = [];
            $rawIds = $request->input('praised_user_ids');
            if (is_string($rawIds)) {
                $decoded = json_decode($rawIds, true);
                if (is_array($decoded)) $praisedUserIds = array_map('intval', $decoded);
            } elseif (is_array($rawIds)) {
                $praisedUserIds = array_map('intval', $rawIds);
            }

            if (empty($praisedUserIds) && $request->filled('praised_user_id')) {
                $praisedUserIds = [(int)$request->input('praised_user_id')];
            }

            $pollData = [
                'praised_user_ids' => array_values(array_unique($praisedUserIds)),
                'praised_user_id' => $praisedUserIds[0] ?? null,
                'badge' => $badge,
                'project_name' => $projectName,
            ];
        }

        if (!Schema::hasColumn('community_posts', 'poll_data')) {
            try {
                Schema::table('community_posts', function (Blueprint $table) {
                    $table->json('poll_data')->nullable()->after('media_url');
                });
            } catch (\Exception $e) {}
        }

        $post = CommunityPost::create([
            'user_id' => $currentUser->id,
            'content' => $request->input('content'),
            'type' => $type,
            'media_url' => $mediaUrl,
            'poll_data' => $pollData,
            'pinned' => false,
        ]);

        // Send notification to ALL praised employees
        if ($type === 'praise' && !empty($pollData['praised_user_ids'])) {
            $authorFullName = trim("{$currentUser->first_name} {$currentUser->last_name}");
            $recipients = User::whereIn('id', $pollData['praised_user_ids'])
                ->where('id', '!=', $currentUser->id)
                ->get();

            foreach ($recipients as $recipient) {
                try {
                    $recipient->notify(new PraiseReceivedNotification(
                        $authorFullName,
                        $pollData['badge'] ?? null,
                        $post->content,
                        $post->id
                    ));
                } catch (\Exception $e) {}
            }
        }

        // Send notification to all employees when a poll is created with notify_employees = true
        if ($type === 'poll' && $request->boolean('notify_employees')) {
            $authorFullName = trim("{$currentUser->first_name} {$currentUser->last_name}");
            $allEmployees = User::where('status', 'active')
                ->where('id', '!=', $currentUser->id)
                ->get();

            foreach ($allEmployees as $emp) {
                try {
                    $emp->notify(new PollNotification(
                        $authorFullName,
                        $post->content,
                        $post->id
                    ));
                } catch (\Exception $e) {}
            }
        }

        $post->load(['user:id,first_name,last_name,email,designation,profile_photo_path', 'comments']);
        $post->user_has_liked = false;
        $post->user_voted_option_id = null;
        $post->likes_count = 0;
        $post->comments_count = 0;

        if ($type === 'praise' && !empty($pollData['praised_user_ids'])) {
            $post->praised_users = User::select('id', 'first_name', 'last_name', 'designation', 'profile_photo_path')
                ->whereIn('id', $pollData['praised_user_ids'])
                ->get();
            $post->praised_user = $post->praised_users[0] ?? null;
        }

        if ($post->media_url && !str_starts_with($post->media_url, 'http')) {
            $post->media_url = url($post->media_url);
        }

        return response()->json([
            'message' => 'Post created successfully',
            'data' => $post,
        ], 201);
    }

    public function votePoll(Request $request, $id)
    {
        $request->validate([
            'option_id' => 'required|integer',
        ]);

        $userId = $request->user()->id;
        $post = CommunityPost::findOrFail($id);

        if ($post->type !== 'poll' || empty($post->poll_data['options'])) {
            return response()->json(['message' => 'This post is not an active poll.'], 422);
        }

        $pollData = $post->poll_data;

        if (!empty($pollData['expires_at']) && Carbon::parse($pollData['expires_at'])->isPast()) {
            return response()->json(['message' => 'This poll has expired.'], 422);
        }

        $targetOptionId = (int)$request->input('option_id');
        $options = $pollData['options'];
        $totalVotes = 0;

        foreach ($options as &$opt) {
            $opt['voter_ids'] = array_values(array_filter($opt['voter_ids'] ?? [], fn($vId) => $vId !== $userId));
            if ($opt['id'] === $targetOptionId) {
                $opt['voter_ids'][] = $userId;
            }
            $opt['votes'] = count($opt['voter_ids']);
            $totalVotes += $opt['votes'];
        }

        $pollData['options'] = $options;
        $pollData['total_votes'] = $totalVotes;

        $post->poll_data = $pollData;
        $post->save();

        return response()->json([
            'message' => 'Vote recorded successfully',
            'poll_data' => $pollData,
            'user_voted_option_id' => $targetOptionId,
        ]);
    }

    public function toggleLike(Request $request, $id)
    {
        $userId = $request->user()->id;
        $post = CommunityPost::findOrFail($id);

        $existing = CommunityPostLike::where('post_id', $id)->where('user_id', $userId)->first();

        if ($existing) {
            $existing->delete();
            $post->decrement('likes_count');
            $liked = false;
        } else {
            CommunityPostLike::create([
                'post_id' => $id,
                'user_id' => $userId,
            ]);
            $post->increment('likes_count');
            $liked = true;
        }

        $freshCount = CommunityPostLike::where('post_id', $id)->count();

        return response()->json([
            'liked' => $liked,
            'likes_count' => $freshCount,
        ]);
    }

    public function addComment(Request $request, $id)
    {
        $request->validate([
            'comment' => 'required|string|max:2000',
        ]);

        $post = CommunityPost::findOrFail($id);

        $comment = CommunityPostComment::create([
            'post_id' => $id,
            'user_id' => $request->user()->id,
            'comment' => $request->input('comment'),
        ]);

        $post->increment('comments_count');
        $comment->load('user:id,first_name,last_name,designation,profile_photo_path');

        return response()->json([
            'message' => 'Comment added successfully',
            'data' => $comment,
            'comments_count' => $post->comments_count,
        ], 201);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $post = CommunityPost::findOrFail($id);

        if ($post->user_id !== $user->id && !$this->isSuperAdmin($user)) {
            return response()->json(['message' => 'Unauthorized to delete this post.'], 403);
        }

        $post->delete();

        return response()->json(['message' => 'Post deleted successfully.']);
    }

    public function destroyComment(Request $request, $id)
    {
        $user = $request->user();
        $comment = CommunityPostComment::findOrFail($id);

        if ($comment->user_id !== $user->id && !$this->isSuperAdmin($user)) {
            return response()->json(['message' => 'Unauthorized to delete this comment.'], 403);
        }

        $postId = $comment->post_id;
        $comment->delete();
        CommunityPost::where('id', $postId)->decrement('comments_count');

        return response()->json(['message' => 'Comment deleted successfully.']);
    }

    public function getEmployees(Request $request)
    {
        $users = User::select('id', 'first_name', 'last_name', 'designation', 'profile_photo_path', 'email')
            ->orderBy('first_name', 'asc')
            ->get()
            ->map(function ($u) {
                return [
                    'id' => $u->id,
                    'name' => trim("{$u->first_name} {$u->last_name}"),
                    'designation' => $u->designation ?? 'Team Member',
                    'profile_photo_path' => $u->profilePhotoUrl(),
                    'email' => $u->email,
                ];
            });

        return response()->json($users);
    }

    public function getProjects(Request $request)
    {
        try {
            $projects = DB::table('pm_projects')
                ->whereNull('deleted_at')
                ->select('id', 'name')
                ->orderBy('name', 'asc')
                ->get();
        } catch (\Exception $e) {
            try {
                $projects = DB::table('projects')
                    ->select('id', 'name')
                    ->orderBy('name', 'asc')
                    ->get();
            } catch (\Exception $e2) {
                $projects = [];
            }
        }

        return response()->json($projects);
    }

    public function getSummary(Request $request)
    {
        $user = $request->user();
        $today = Carbon::today();

        $upcomingHoliday = Holiday::where('date', '>=', $today->format('Y-m-d'))
            ->orderBy('date', 'asc')
            ->first();

        $onLeaveToday = LeaveRequest::where('status', 'Approved')
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->with('user:id,first_name,last_name,designation,profile_photo_path,email')
            ->get()
            ->map(function ($req) {
                return [
                    'id' => $req->user_id,
                    'name' => ($req->user ? "{$req->user->first_name} {$req->user->last_name}" : 'Employee'),
                    'designation' => $req->user->designation ?? 'Team Member',
                    'profile_photo_path' => $req->user ? $req->user->profilePhotoUrl() : null,
                    'leave_type' => $req->leave_type,
                ];
            });

        $wfhToday = WfhRequest::where('status', 'Approved')
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->with('user:id,first_name,last_name,designation,profile_photo_path,email')
            ->get()
            ->map(function ($req) {
                return [
                    'id' => $req->user_id,
                    'name' => ($req->user ? "{$req->user->first_name} {$req->user->last_name}" : 'Employee'),
                    'designation' => $req->user->designation ?? 'Team Member',
                    'profile_photo_path' => $req->user ? $req->user->profilePhotoUrl() : null,
                ];
            });

        $balance = LeaveBalance::where('user_id', $user->id)->first();
        $casualDays = $balance ? (float)$balance->casual_leave_balance : 0;
        $sickDays = $balance ? (float)$balance->sick_leave_balance : 0;

        $allUsers = User::select('id', 'first_name', 'last_name', 'designation', 'profile_photo_path', 'email', 'date_of_birth', 'date_of_joining', 'status')
            ->get();

        $birthdaysToday = [];
        $birthdaysUpcoming = [];
        $anniversariesToday = [];
        $anniversariesUpcoming = [];
        $recentlyJoined = [];

        foreach ($allUsers as $u) {
            if ($u->date_of_birth) {
                $dob = Carbon::parse($u->date_of_birth);
                $thisYearBday = Carbon::create($today->year, $dob->month, $dob->day)->startOfDay();
                if ($thisYearBday->isPast() && !$thisYearBday->isSameDay($today)) {
                    $thisYearBday->addYear();
                }
                $daysToBday = $today->diffInDays($thisYearBday, false);

                $bdayData = [
                    'id' => $u->id,
                    'name' => trim("{$u->first_name} {$u->last_name}"),
                    'designation' => $u->designation ?? 'Team Member',
                    'profile_photo_path' => $u->profilePhotoUrl(),
                    'email' => $u->email,
                    'date' => $thisYearBday->format('Y-m-d'),
                    'days_remaining' => (int)$daysToBday,
                ];

                if ($daysToBday === 0) {
                    $birthdaysToday[] = $bdayData;
                } elseif ($daysToBday > 0 && $daysToBday <= 30) {
                    $birthdaysUpcoming[] = $bdayData;
                }
            }

            if ($u->date_of_joining) {
                $doj = Carbon::parse($u->date_of_joining);
                $years = $today->year - $doj->year;

                if ($years >= 1) {
                    $thisYearAnni = Carbon::create($today->year, $doj->month, $doj->day)->startOfDay();
                    if ($thisYearAnni->isPast() && !$thisYearAnni->isSameDay($today)) {
                        $thisYearAnni->addYear();
                    }
                    $daysToAnni = $today->diffInDays($thisYearAnni, false);

                    $anniData = [
                        'id' => $u->id,
                        'name' => trim("{$u->first_name} {$u->last_name}"),
                        'designation' => $u->designation ?? 'Team Member',
                        'profile_photo_path' => $u->profilePhotoUrl(),
                        'email' => $u->email,
                        'years' => $years,
                        'date' => $thisYearAnni->format('Y-m-d'),
                        'days_remaining' => (int)$daysToAnni,
                    ];

                    if ($daysToAnni === 0) {
                        $anniversariesToday[] = $anniData;
                    } elseif ($daysToAnni > 0 && $daysToAnni <= 30) {
                        $anniversariesUpcoming[] = $anniData;
                    }
                }

                $joinedDaysAgo = $doj->diffInDays($today, false);
                if ($joinedDaysAgo >= 0 && $joinedDaysAgo <= 60) {
                    $recentlyJoined[] = [
                        'id' => $u->id,
                        'name' => trim("{$u->first_name} {$u->last_name}"),
                        'designation' => $u->designation ?? 'Team Member',
                        'profile_photo_path' => $u->profilePhotoUrl(),
                        'email' => $u->email,
                        'date_of_joining' => $u->date_of_joining,
                        'joined_days_ago' => (int)$joinedDaysAgo,
                    ];
                }
            }
        }

        usort($birthdaysUpcoming, fn($a, $b) => $a['days_remaining'] <=> $b['days_remaining']);
        usort($anniversariesUpcoming, fn($a, $b) => $a['days_remaining'] <=> $b['days_remaining']);

        // Fetch active projects
        try {
            $projects = DB::table('pm_projects')
                ->whereNull('deleted_at')
                ->select('id', 'name')
                ->orderBy('name', 'asc')
                ->get();
        } catch (\Exception $e) {
            $projects = [];
        }

        return response()->json([
            'upcoming_holiday' => $upcomingHoliday,
            'on_leave_today' => $onLeaveToday,
            'wfh_today' => $wfhToday,
            'leave_balances' => [
                'casual' => $casualDays,
                'sick' => $sickDays,
            ],
            'celebrations' => [
                'birthdays_today' => $birthdaysToday,
                'birthdays_upcoming' => $birthdaysUpcoming,
                'anniversaries_today' => $anniversariesToday,
                'anniversaries_upcoming' => $anniversariesUpcoming,
                'recently_joined' => $recentlyJoined,
            ],
            'all_employees' => $allUsers->map(fn($u) => [
                'id' => $u->id,
                'name' => trim("{$u->first_name} {$u->last_name}"),
                'designation' => $u->designation ?? 'Team Member',
                'profile_photo_path' => $u->profilePhotoUrl(),
                'email' => $u->email,
            ]),
            'projects' => $projects,
        ]);
    }
}
