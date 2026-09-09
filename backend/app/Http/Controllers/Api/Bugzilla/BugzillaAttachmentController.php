<?php

namespace App\Http\Controllers\Api\Bugzilla;

use App\Http\Controllers\Controller;
use App\Models\BugzillaAttachment;
use App\Models\BugzillaBug;
use App\Models\BugzillaHistory;
use App\Services\BugzillaAuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class BugzillaAttachmentController extends Controller
{
    /**
     * Upload an attachment to a bug.
     */
    public function store(Request $request, $bugId)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canReport($user) && !BugzillaAuthService::canDevelop($user)) {
            return response()->json(['message' => 'Reporter or Developer capability required to upload attachments.'], 403);
        }

        $bug = BugzillaBug::findOrFail($bugId);
        if (!BugzillaAuthService::canAccessProject($user, $bug->portal_project_id)) {
            return response()->json(['message' => 'Unauthorized project access.'], 403);
        }

        $request->validate([
            'file' => 'required|file|max:20480', // 20MB limit
            'description' => 'nullable|string|max:255',
        ]);

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $mimeType = $file->getClientMimeType();
        $fileSize = $file->getSize();

        $path = $file->store('bugzilla-attachments/' . $bug->id, 'public');

        $attachment = BugzillaAttachment::create([
            'bug_id' => $bug->id,
            'uploaded_by' => $user->id,
            'file_path' => $path,
            'original_name' => $originalName,
            'mime_type' => $mimeType,
            'file_size' => $fileSize,
            'description' => $request->input('description'),
            'is_private' => false,
            'created_at' => now(),
        ]);

        BugzillaHistory::logChange($bug->id, $user->id, 'attachment_uploaded', 'attachment', null, "Uploaded attachment {$originalName}");

        return response()->json([
            'message' => 'Attachment uploaded successfully.',
            'attachment' => $attachment->load('uploader:id,first_name,last_name'),
        ], 201);
    }

    /**
     * Delete an attachment.
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $attachment = BugzillaAttachment::findOrFail($id);
        $bug = BugzillaBug::findOrFail($attachment->bug_id);

        if (!BugzillaAuthService::canAccessProject($user, $bug->portal_project_id)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $canDelete = BugzillaAuthService::isSuperAdmin($user) || (int) $attachment->uploaded_by === (int) $user->id;
        if (!$canDelete) {
            return response()->json(['message' => 'You can only delete your own attachments.'], 403);
        }

        if (Storage::disk('public')->exists($attachment->file_path)) {
            Storage::disk('public')->delete($attachment->file_path);
        }

        $fileName = $attachment->original_name;
        $attachment->delete();

        BugzillaHistory::logChange($bug->id, $user->id, 'attachment_deleted', 'attachment', $fileName, null);

        return response()->json([
            'message' => 'Attachment removed successfully.',
        ]);
    }
}
