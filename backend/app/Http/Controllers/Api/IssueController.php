<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Issue;
use App\Models\IssueComment;
use App\Models\IssueAttachment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class IssueController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        
        $query = Issue::with(['user:id,first_name,last_name,profile_photo_path,employee_id', 'assignedTo:id,first_name,last_name'])
            ->withCount('comments');

        if ($user->hasRole('Super Admin')) {
            // Super Admin can filter
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
            // Employee / Team Lead see their own issues
            $query->where('user_id', $user->id);
        }

        $issues = $query->orderBy('created_at', 'desc')->get();

        return response()->json(['data' => $issues]);
    }

    public function show($id)
    {
        $user = Auth::user();
        $issue = Issue::with([
            'user:id,first_name,last_name,profile_photo_path,employee_id',
            'assignedTo:id,first_name,last_name',
            'comments.user:id,first_name,last_name,profile_photo_path',
            'comments.attachments',
            'attachments'
        ])->findOrFail($id);

        if (!$user->hasRole('Super Admin') && $issue->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json(['data' => $issue]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category' => 'required|string|max:255',
            'priority' => 'required|string|in:Low,Medium,High,Critical',
            'description' => 'required|string',
            'related_module' => 'nullable|string|max:255',
        ]);

        $superAdmin = User::role('Super Admin')->first();

        $issue = Issue::create([
            'user_id' => Auth::id(),
            'title' => $validated['title'],
            'category' => $validated['category'],
            'priority' => $validated['priority'],
            'description' => $validated['description'],
            'related_module' => $validated['related_module'] ?? null,
            'status' => 'Open',
            'assigned_to' => $superAdmin ? $superAdmin->id : null,
        ]);

        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store('issue-attachments', 'public');
                IssueAttachment::create([
                    'issue_id' => $issue->id,
                    'file_path' => $path,
                    'file_name' => $file->getClientOriginalName(),
                    'file_type' => $file->getClientMimeType(),
                ]);
            }
        }

        return response()->json(['message' => 'Issue raised successfully.', 'data' => $issue]);
    }

    public function addComment(Request $request, $id)
    {
        $validated = $request->validate([
            'comment' => 'required|string',
        ]);

        $issue = Issue::findOrFail($id);
        $user = Auth::user();

        if (!$user->hasRole('Super Admin') && $issue->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $comment = IssueComment::create([
            'issue_id' => $issue->id,
            'user_id' => $user->id,
            'comment' => $validated['comment'],
        ]);

        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store('issue-attachments', 'public');
                IssueAttachment::create([
                    'issue_id' => $issue->id,
                    'issue_comment_id' => $comment->id,
                    'file_path' => $path,
                    'file_name' => $file->getClientOriginalName(),
                    'file_type' => $file->getClientMimeType(),
                ]);
            }
        }

        // If employee comments on resolved/closed issue, it might reopen or stay resolved depending on rules.
        // The prompt says "Reopen a resolved issue if the problem still exists". 
        // Let's assume there's an explicit status update for reopening, but we'll leave comment as just a comment for now.

        return response()->json(['message' => 'Comment added successfully.', 'data' => $comment->load('attachments', 'user')]);
    }

    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:Open,In Progress,Waiting for User Response,Resolved,Closed,Rejected',
        ]);

        $issue = Issue::findOrFail($id);
        $user = Auth::user();

        // Only Super Admin can change status freely, BUT Employee can reopen resolved issues
        if (!$user->hasRole('Super Admin')) {
            if ($validated['status'] === 'Open' && in_array($issue->status, ['Resolved', 'Closed'])) {
                // Allow reopening
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

        return response()->json(['message' => 'Status updated successfully.', 'data' => $issue]);
    }
}
