<?php

namespace App\Http\Controllers\Api\Bugzilla;

use App\Http\Controllers\Controller;
use App\Models\BugzillaBug;
use App\Models\BugzillaComment;
use App\Models\BugzillaHistory;
use App\Services\BugzillaAuthService;
use Illuminate\Http\Request;

class BugzillaCommentController extends Controller
{
    /**
     * List comments for a bug.
     */
    public function index(Request $request, $bugId)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canView($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $bug = BugzillaBug::findOrFail($bugId);
        if (!BugzillaAuthService::canAccessProject($user, $bug->portal_project_id)) {
            return response()->json(['message' => 'Unauthorized project access.'], 403);
        }

        $comments = BugzillaComment::where('bug_id', $bugId)
            ->with('user:id,first_name,last_name,email,avatar')
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json([
            'comments' => $comments,
        ]);
    }

    /**
     * Post a comment on a bug.
     */
    public function store(Request $request, $bugId)
    {
        $user = $request->user();
        // Viewers cannot comment; Developers or Reporters can comment
        if (!BugzillaAuthService::canDevelop($user) && !BugzillaAuthService::canReport($user)) {
            return response()->json(['message' => 'Reporter or Developer capability required to comment.'], 403);
        }

        $bug = BugzillaBug::findOrFail($bugId);
        if (!BugzillaAuthService::canAccessProject($user, $bug->portal_project_id)) {
            return response()->json(['message' => 'Unauthorized project access.'], 403);
        }

        $validated = $request->validate([
            'comment' => 'required|string',
            'is_private' => 'sometimes|boolean',
        ]);

        $comment = BugzillaComment::create([
            'bug_id' => $bugId,
            'user_id' => $user->id,
            'comment' => trim($validated['comment']),
            'is_private' => $validated['is_private'] ?? false,
        ]);

        // Auto-watch bug on comment
        $bug->watchers()->firstOrCreate(['user_id' => $user->id]);

        // History entry
        BugzillaHistory::logChange($bugId, $user->id, 'comment_added', 'comment', null, 'New comment added');

        return response()->json([
            'message' => 'Comment added successfully.',
            'comment' => $comment->load('user:id,first_name,last_name,email'),
        ], 201);
    }
}
