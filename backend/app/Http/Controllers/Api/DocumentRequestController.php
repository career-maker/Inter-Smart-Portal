<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use App\Models\User;
use App\Notifications\DocumentRequestNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DocumentRequestController extends Controller
{
    public function index(Request $request)
    {
        $user  = $request->user();
        $query = DocumentRequest::with(['user', 'uploads']);

        if ($user->hasRole('Employee')) {
            $query->where('user_id', $user->id);
        }

        return response()->json(['data' => $query->orderBy('created_at', 'desc')->paginate(20)]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'subject'     => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $requestNumber = 'REQ-' . strtoupper(Str::random(6));
        while (DocumentRequest::where('request_number', $requestNumber)->exists()) {
            $requestNumber = 'REQ-' . strtoupper(Str::random(6));
        }

        $docRequest = DocumentRequest::create([
            'user_id'        => $request->user()->id,
            'request_number' => $requestNumber,
            'subject'        => $data['subject'],
            'description'    => $data['description'] ?? null,
            'status'         => 'Pending',
        ]);

        // Notify Super Admins
        try {
            $submitter = $request->user();
            $fullName  = "{$submitter->first_name} {$submitter->last_name}";
            $message   = "{$fullName} has requested: {$docRequest->subject} ({$docRequest->request_number})";
            foreach (User::role('Super Admin')->get() as $admin) {
                if ($admin->id !== $submitter->id) {
                    $admin->notify(new DocumentRequestNotification($docRequest, $message));
                }
            }
        } catch (\Exception $e) {}

        return response()->json([
            'message' => 'Document request submitted successfully.',
            'data'    => $docRequest->load('uploads'),
        ], 201);
    }

    /**
     * HR/Admin fulfills a request — either by uploading a file, providing a URL, or both.
     * At least one of file or document_url must be provided.
     */
    public function upload(Request $request, DocumentRequest $documentRequest)
    {
        $request->validate([
            'file'         => ['nullable', 'file', 'mimes:pdf,doc,docx,jpg,jpeg,png', 'max:10240'],
            'document_url' => ['nullable', 'url', 'max:2048'],
            'comments'     => ['nullable', 'string'],
        ]);

        if (!$request->hasFile('file') && !$request->filled('document_url')) {
            return response()->json([
                'message' => 'Please upload a file or provide a document URL.'
            ], 422);
        }

        $filePath    = null;
        $documentUrl = null;

        if ($request->hasFile('file')) {
            $filePath = $request->file('file')->store('documents', 'public');
        }

        if ($request->filled('document_url')) {
            $documentUrl = $request->document_url;
        }

        DocumentUpload::create([
            'document_request_id' => $documentRequest->id,
            'file_path'           => $filePath,
            'document_url'        => $documentUrl,
            'comments'            => $request->comments,
            'uploaded_by'         => $request->user()->id,
        ]);

        $documentRequest->update(['status' => 'Uploaded']);

        return response()->json([
            'message' => 'Document fulfilled successfully.',
            'data'    => $documentRequest->fresh(['uploads']),
        ]);
    }
}
