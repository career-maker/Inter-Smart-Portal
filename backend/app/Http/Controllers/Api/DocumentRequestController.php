<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use App\Models\User;
use App\Mail\DocumentFulfilledMail;
use App\Notifications\DocumentRequestNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
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
        } catch (\Exception $e) {
            Log::error("Failed to notify admins of document request: " . $e->getMessage());
        }

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

        $upload = DocumentUpload::create([
            'document_request_id' => $documentRequest->id,
            'file_path'           => $filePath,
            'document_url'        => $documentUrl,
            'comments'            => $request->comments,
            'uploaded_by'         => $request->user()->id,
        ]);

        $documentRequest->update(['status' => 'Uploaded']);

        $employee = $documentRequest->user;

        // 1. Send in-app notification to employee
        try {
            if ($employee) {
                $employee->notify(new DocumentRequestNotification(
                    $documentRequest,
                    "Your requested document for \"{$documentRequest->subject}\" ({$documentRequest->request_number}) is ready.",
                    'Document Request Fulfilled',
                    'document_fulfilled',
                    '/documents'
                ));
            }
        } catch (\Exception $e) {
            Log::error("Failed to send in-app notification for document fulfillment: " . $e->getMessage());
        }

        // 2. Send email notification to employee
        try {
            if ($employee && $employee->email) {
                Mail::to($employee->email)->send(new DocumentFulfilledMail($documentRequest, $upload, $employee));
                Log::info("✅ Document fulfillment email sent to {$employee->email}");
            }
        } catch (\Exception $e) {
            Log::error("Failed to send email for document fulfillment: " . $e->getMessage());
        }

        return response()->json([
            'message' => 'Document fulfilled successfully.',
            'data'    => $documentRequest->fresh(['uploads']),
        ]);
    }
}
