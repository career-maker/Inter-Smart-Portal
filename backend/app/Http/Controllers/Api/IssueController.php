<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Issue;
use App\Models\IssueComment;
use App\Models\IssueAttachment;
use App\Models\User;
use App\Notifications\IssueNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class IssueController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();

        $query = Issue::with(['user:id,first_name,last_name,profile_photo_path,employee_code'])
            ->withCount('comments');

        if ($user->hasRole('Super Admin')) {
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }
            if ($request->has('priority')) {
                $query->where('priority', $request->priority);
            }
            if ($request->has('category')) {
                $query->where('category', $request->category);
            }
        } else {
            // Show own issues AND issues assigned to the logged-in user
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhere('assigned_to', $user->id);
            });
        }

        return response()->json(['data' => $query->orderBy('created_at', 'desc')->get()]);
    }

    public function show($id)
    {
        $user = Auth::user();
        $issue = Issue::with([
            'user:id,first_name,last_name,profile_photo_path,employee_code',
            'assignedTo:id,first_name,last_name',
            'comments.user:id,first_name,last_name,profile_photo_path',
            'comments.attachments',
            'attachments',
        ])->findOrFail($id);

        if (!$user->hasRole('Super Admin') && $issue->user_id !== $user->id && $issue->assigned_to !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json(['data' => $issue]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'          => 'required|string|max:255',
            'category'       => 'required|string|max:255',
            'priority'       => 'required|string|in:Low,Medium,High,Critical',
            'description'    => 'required|string',
            'related_module' => 'nullable|string|max:255',
            'attachment_link'=> 'nullable|url|max:2048',
        ]);

        $superAdmin = User::role('Super Admin')->first();

        $issue = Issue::create([
            'user_id'         => Auth::id(),
            'title'           => $validated['title'],
            'category'        => $validated['category'],
            'priority'        => $validated['priority'],
            'description'     => $validated['description'],
            'related_module'  => $validated['related_module'] ?? null,
            'attachment_link' => $validated['attachment_link'] ?? null,
            'status'          => 'Open',
            'assigned_to'     => $superAdmin ? $superAdmin->id : null,
        ]);

        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store('issue-attachments', 'public');
                IssueAttachment::create([
                    'issue_id'  => $issue->id,
                    'file_path' => $path,
                    'file_name' => $file->getClientOriginalName(),
                    'file_type' => $file->getClientMimeType(),
                ]);
            }
        }

        // Notify all Super Admins
        try {
            $submitter = Auth::user();
            $fullName  = "{$submitter->first_name} {$submitter->last_name}";
            $message   = "{$fullName} has raised a new issue: \"{$issue->title}\" (Priority: {$issue->priority})";

            foreach (User::role('Super Admin')->get() as $admin) {
                if ($admin->id !== $submitter->id) {
                    $admin->notify(new IssueNotification($issue, $message));
                }
            }
        } catch (\Throwable $e) {}

        return response()->json([
            'message' => 'Issue raised successfully.',
            'data'    => $issue->load(['attachments']),
        ], 201);
    }

    public function addComment(Request $request, $id)
    {
        $validated = $request->validate([
            'comment' => 'required|string',
        ]);

        $issue = Issue::findOrFail($id);
        $user  = Auth::user();

        if (!$user->hasRole('Super Admin') && $issue->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $comment = IssueComment::create([
            'issue_id' => $issue->id,
            'user_id'  => $user->id,
            'comment'  => $validated['comment'],
        ]);

        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store('issue-attachments', 'public');
                IssueAttachment::create([
                    'issue_id'         => $issue->id,
                    'issue_comment_id' => $comment->id,
                    'file_path'        => $path,
                    'file_name'        => $file->getClientOriginalName(),
                    'file_type'        => $file->getClientMimeType(),
                ]);
            }
        }

        return response()->json([
            'message' => 'Comment added successfully.',
            'data'    => $comment->load('attachments', 'user'),
        ]);
    }

    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:Open,In Progress,Waiting for User Response,Resolved,Closed,Rejected',
        ]);

        $issue = Issue::findOrFail($id);
        $user  = Auth::user();

        if (!$user->hasRole('Super Admin')) {
            $isAssigned = (int)$issue->assigned_to === (int)$user->id;
            $isOwner    = (int)$issue->user_id    === (int)$user->id;

            if ($isAssigned && $validated['status'] === 'Resolved') {
                // Assigned employee may mark their task as Resolved
            } elseif ($isOwner && $validated['status'] === 'Open' && in_array($issue->status, ['Resolved', 'Closed'])) {
                // Owner may reopen a resolved/closed issue
            } else {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        $issue->status = $validated['status'];
        if (in_array($validated['status'], ['Resolved', 'Closed', 'Rejected'])) {
            $issue->resolved_at = now();
        } else {
            $issue->resolved_at = null;
        }
        $issue->save();

        // Notify the issue submitter
        try {
            $actorName = "{$user->first_name} {$user->last_name}";
            $msg = "Your issue \"{$issue->title}\" has been marked as {$validated['status']} by {$actorName}.";
            if ($issue->user && $issue->user_id !== $user->id) {
                $issue->user->notify(new IssueNotification($issue, $msg));
            }
        } catch (\Throwable $e) {}

        return response()->json(['message' => 'Status updated successfully.', 'data' => $issue]);
    }

    public function assign(Request $request, $id)
    {
        if (!Auth::user()->hasRole('Super Admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        $issue = Issue::findOrFail($id);
        $previousAssignee = $issue->assigned_to;
        $issue->assigned_to = $validated['assigned_to'] ?? null;
        $issue->save();

        // Notify the newly assigned employee
        try {
            if ($issue->assigned_to && (int)$issue->assigned_to !== (int)$previousAssignee) {
                $assignee  = User::find($issue->assigned_to);
                $admin     = Auth::user();
                $adminName = "{$admin->first_name} {$admin->last_name}";
                $msg = "{$adminName} has assigned you to resolve issue #{$issue->id}: \"{$issue->title}\".";
                if ($assignee) {
                    $assignee->notify(new IssueNotification($issue, $msg));
                }
            }
        } catch (\Throwable $e) {}

        return response()->json([
            'message' => 'Issue assigned successfully.',
            'data'    => $issue->load(['assignedTo:id,first_name,last_name']),
        ]);
    }
}
