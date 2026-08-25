<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProjectTaskCommentRequest;
use App\Models\ProjectTask;
use App\Models\ProjectTaskComment;
use App\Services\ProjectManagement\ProjectAuditLogger;
use App\Services\ProjectManagement\ProjectAuthorizationService;
use Illuminate\Http\Request;

/**
 * List + create only — no edit/delete. Matches the existing app's own
 * precedent (issue_comments has no update/destroy route either); a
 * comment is an append-only record of what was said, when.
 */
class ProjectTaskCommentController extends Controller
{
    public function __construct(
        private readonly ProjectAuthorizationService $auth,
        private readonly ProjectAuditLogger $auditLogger,
    ) {}

    public function index(Request $request, ProjectTask $task)
    {
        $user = $request->user();

        if (!$this->auth->canViewTask($user, $task)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $comments = $task->comments()
            ->with('user:id,first_name,last_name,profile_photo_path')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $comments]);
    }

    public function store(StoreProjectTaskCommentRequest $request, ProjectTask $task)
    {
        $user = $request->user();

        if (!$this->auth->canParticipateOnTask($user, $task)) {
            return response()->json(['message' => 'Unauthorized to comment on this task.'], 403);
        }

        $comment = ProjectTaskComment::create([
            'task_id' => $task->id,
            'user_id' => $user->id,
            'comment' => $request->validated()['comment'],
        ]);

        $this->auditLogger->log($user, 'pm.task.comment_added', $task, [], ['comment_id' => $comment->id], $request);

        return response()->json([
            'message' => 'Comment added successfully.',
            'data' => $comment->load('user:id,first_name,last_name,profile_photo_path'),
        ], 201);
    }
}
