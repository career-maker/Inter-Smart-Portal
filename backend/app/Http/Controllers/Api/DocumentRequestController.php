<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DocumentRequestController extends Controller
{
    /**
     * List document requests.
     * Employees see their own; Admin/HR/Lead see all.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = DocumentRequest::with(['user', 'uploads']);

        if ($user->hasRole('Employee')) {
            $query->where('user_id', $user->id);
        }

        $requests = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json(['data' => $requests]);
    }

    /**
     * Employee submits a new document request.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'subject'     => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $requestNumber = 'REQ-' . strtoupper(Str::random(6));

        // Ensure unique request number
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

        return response()->json([
            'message' => 'Document request submitted successfully.',
            'data'    => $docRequest->load('uploads'),
        ], 201);
    }

    /**
     * HR/Admin uploads a fulfilled document for a request.
     */
    public function upload(Request $request, DocumentRequest $documentRequest)
    {
        $request->validate([
            'file'     => ['required', 'file', 'mimes:pdf,doc,docx,jpg,jpeg,png', 'max:10240'],
            'comments' => ['nullable', 'string'],
        ]);

        $path = $request->file('file')->store('documents', 'public');

        DocumentUpload::create([
            'document_request_id' => $documentRequest->id,
            'file_path'           => $path,
            'comments'            => $request->comments,
            'uploaded_by'         => $request->user()->id,
        ]);

        $documentRequest->update(['status' => 'Uploaded']);

        return response()->json([
            'message' => 'Document uploaded successfully.',
            'data'    => $documentRequest->fresh(['uploads']),
        ]);
    }
}
