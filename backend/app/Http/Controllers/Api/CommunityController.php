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
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class CommunityController extends Controller
{
    /**
     * Get paginated community feed posts with likes & comments
     */
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $posts = CommunityPost::with([
            'user:id,first_name,last_name,email,designation,profile_photo_path',
            'comments.user:id,first_name,last_name,designation,profile_photo_path'
        ])
            ->withCount('likes')
            ->withCount('comments')
            ->orderBy('pinned', 'desc')
            ->latest()
            ->paginate(20);

        // Append user_has_liked
        $postIds = $posts->pluck('id')->toArray();
        $userLikedPostIds = CommunityPostLike::where('user_id', $userId)
            ->whereIn('post_id', $postIds)
            ->pluck('post_id')
            ->toArray();

        $posts->getCollection()->transform(function ($post) use ($userLikedPostIds) {
            $post->user_has_liked = in_array($post->id, $userLikedPostIds);
            // Format media_url to full URL if stored relative
            if ($post->media_url && !str_starts_with($post->media_url, 'http')) {
                $post->media_url = url($post->media_url);
            }
            return $post;
        });

        return response()->json($posts);
    }

    /**
     * Create a new community post (supports text, praise, poll, and image uploads)
     */
    public function store(Request $request)
    {
        $request->validate([
            'content' => 'required|string|max:5000',
            'type' => 'nullable|string|in:post,praise,poll',
            'media_url' => 'nullable|string',
            'image' => 'nullable|image|max:10240', // 10MB max
        ]);

        $mediaUrl = $request->input('media_url');

        // Handle uploaded image file
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('community', 'public');
            $mediaUrl = '/storage/' . $path;
        }

        $post = CommunityPost::create([
            'user_id' => $request->user()->id,
            'content' => $request->input('content'),
            'type' => $request->input('type', 'post'),
            'media_url' => $mediaUrl,
            'pinned' => false,
        ]);

        $post->load(['user:id,first_name,last_name,email,designation,profile_photo_path', 'comments']);
        $post->user_has_liked = false;
        $post->likes_count = 0;
        $post->comments_count = 0;

        if ($post->media_url && !str_starts_with($post->media_url, 'http')) {
            $post->media_url = url($post->media_url);
        }

        return response()->json([
            'message' => 'Post created successfully',
            'data' => $post,
        ], 201);
    }

    /**
     * Toggle like on a post
     */
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

    /**
     * Add comment to post
     */
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

    /**
     * Delete post (author or super admin)
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $post = CommunityPost::findOrFail($id);

        if ($post->user_id !== $user->id && $user->role !== 'Super Admin') {
            return response()->json(['message' => 'Unauthorized to delete this post.'], 403);
        }

        $post->delete();

        return response()->json(['message' => 'Post deleted successfully.']);
    }

    /**
     * Delete comment (author or super admin)
     */
    public function destroyComment(Request $request, $id)
    {
        $user = $request->user();
        $comment = CommunityPostComment::findOrFail($id);

        if ($comment->user_id !== $user->id && $user->role !== 'Super Admin') {
            return response()->json(['message' => 'Unauthorized to delete this comment.'], 403);
        }

        $postId = $comment->post_id;
        $comment->delete();
        CommunityPost::where('id', $postId)->decrement('comments_count');

        return response()->json(['message' => 'Comment deleted successfully.']);
    }

    /**
     * Get aggregated dynamic community summary (Holidays, Leaves, WFH, Balances, Birthdays, Anniversaries, New Joiners)
     */
    public function getSummary(Request $request)
    {
        $user = $request->user();
        $today = Carbon::today();

        // 1. Next Upcoming Holiday
        $upcomingHoliday = Holiday::where('date', '>=', $today->format('Y-m-d'))
            ->orderBy('date', 'asc')
            ->first();

        // 2. On Leave Today
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
                    'profile_photo_path' => $req->user->profile_photo_path ?? null,
                    'leave_type' => $req->leave_type,
                ];
            });

        // 3. Working Remotely (WFH) Today
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
                    'profile_photo_path' => $req->user->profile_photo_path ?? null,
                ];
            });

        // 4. User Leave Balances
        $casualBalance = LeaveBalance::where('user_id', $user->id)
            ->where(function ($q) {
                $q->where('leave_type', 'like', '%Casual%')->orWhere('leave_type', 'CL');
            })->first();

        $sickBalance = LeaveBalance::where('user_id', $user->id)
            ->where(function ($q) {
                $q->where('leave_type', 'like', '%Sick%')->orWhere('leave_type', 'SL');
            })->first();

        $casualDays = $casualBalance ? ($casualBalance->balance ?? $casualBalance->remaining_days ?? 12) : 12;
        $sickDays = $sickBalance ? ($sickBalance->balance ?? $sickBalance->remaining_days ?? 10) : 10;

        // 5. Birthdays & Anniversaries from all employees
        $allUsers = User::where('status', 'active')->get();
        $birthdaysToday = [];
        $birthdaysUpcoming = [];
        $anniversariesToday = [];
        $anniversariesUpcoming = [];
        $recentlyJoined = [];

        foreach ($allUsers as $u) {
            // Check DOB
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
                    'profile_photo_path' => $u->profile_photo_path,
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

            // Check Joining Date for Anniversaries & New Joiners
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
                        'profile_photo_path' => $u->profile_photo_path,
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

                // Check recently joined (within last 60 days)
                $joinedDaysAgo = $doj->diffInDays($today, false);
                if ($joinedDaysAgo >= 0 && $joinedDaysAgo <= 60) {
                    $recentlyJoined[] = [
                        'id' => $u->id,
                        'name' => trim("{$u->first_name} {$u->last_name}"),
                        'designation' => $u->designation ?? 'Team Member',
                        'profile_photo_path' => $u->profile_photo_path,
                        'email' => $u->email,
                        'date_of_joining' => $u->date_of_joining,
                        'joined_days_ago' => (int)$joinedDaysAgo,
                    ];
                }
            }
        }

        usort($birthdaysUpcoming, fn($a, $b) => $a['days_remaining'] <=> $b['days_remaining']);
        usort($anniversariesUpcoming, fn($a, $b) => $a['days_remaining'] <=> $b['days_remaining']);

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
        ]);
    }
}
