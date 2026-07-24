<?php

namespace App\Http\Controllers\Api;

use App\Models\TARequest;
use App\Models\TARequestItem;
use App\Models\Notification;
use App\Mail\TARequestMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;

class TARequestController
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = TARequest::with('user', 'items', 'approver');

        if ($user->role !== 'Super Admin') {
            $query->where('user_id', $user->id);
        }

        $status = $request->query('status');
        if ($status) {
            $query->where('status', $status);
        }

        $requests = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json([
            'data' => $requests->items(),
            'meta' => [
                'total' => $requests->total(),
                'per_page' => $requests->perPage(),
                'current_page' => $requests->currentPage(),
                'last_page' => $requests->lastPage(),
            ],
        ]);
    }

    public function show($id)
    {
        $request = TARequest::with('user', 'items', 'approver')->findOrFail($id);
        $user = Auth::user();

        if ($user->role !== 'Super Admin' && $request->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($request);
    }

    public function store(Request $request)
    {
        $user = Auth::user();

        // Only Employee and Team Lead can apply
        if (!in_array($user->role, ['Employee', 'Team Lead'])) {
            return response()->json(['message' => 'Only employees and team leads can apply for travel allowance'], 403);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:500',
            'date_travelled' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.category' => 'required|string',
            'items.*.amount' => 'required|numeric|min:0',
            'items.*.description' => 'nullable|string',
            'bill_link' => 'nullable|url|max:500',
        ]);

        $totalAmount = collect($validated['items'])->sum('amount');

        $taRequest = TARequest::create([
            'user_id' => $user->id,
            'reason' => $validated['reason'],
            'date_travelled' => $validated['date_travelled'],
            'total_amount' => $totalAmount,
            'bill_link' => $validated['bill_link'] ?? null,
            'created_by' => $user->id,
        ]);

        // Create breakdown items
        foreach ($validated['items'] as $item) {
            TARequestItem::create([
                'ta_request_id' => $taRequest->id,
                'category' => $item['category'],
                'amount' => $item['amount'],
                'description' => $item['description'] ?? null,
            ]);
        }

        // Send notification to Super Admin/HR
        $admins = \App\Models\User::where('role', 'Super Admin')->get();
        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'ta_request_applied',
                'title' => 'New TA Request',
                'message' => "{$user->first_name} {$user->last_name} has applied for travel allowance",
                'data' => json_encode(['ta_request_id' => $taRequest->id]),
                'is_read' => false,
            ]);
        }

        // Send email to HR and admin
        $approveUrl = URL::signedRoute('ta-request.email-approve', ['taRequest' => $taRequest->id]);
        $rejectUrl = URL::signedRoute('ta-request.email-reject', ['taRequest' => $taRequest->id]);

        $emailData = [
            'employee_name' => "{$user->first_name} {$user->last_name}",
            'approve_url' => $approveUrl,
            'reject_url' => $rejectUrl,
        ];

        // Send to HR emails
        $hrEmails = ['HR@intersmart.in', 'Ameesha@intersmart.in'];
        foreach ($hrEmails as $email) {
            Mail::to($email)->send(new TARequestMail($taRequest, $emailData));
        }

        return response()->json([
            'message' => 'TA request submitted successfully',
            'data' => $taRequest->load('items'),
        ], 201);
    }

    public function approve(Request $request, $id)
    {
        $user = Auth::user();

        if ($user->role !== 'Super Admin') {
            return response()->json(['message' => 'Only super admin can approve TA requests'], 403);
        }

        $taRequest = TARequest::findOrFail($id);

        if ($taRequest->status !== 'Applied') {
            return response()->json(['message' => 'Only applied requests can be approved'], 400);
        }

        $validated = $request->validate([
            'approval_notes' => 'nullable|string|max:500',
        ]);

        $taRequest->update([
            'status' => 'Approved',
            'approver_id' => $user->id,
            'approval_notes' => $validated['approval_notes'] ?? null,
            'updated_by' => $user->id,
        ]);

        // Notify applicant
        Notification::create([
            'user_id' => $taRequest->user_id,
            'type' => 'ta_request_approved',
            'title' => 'TA Request Approved',
            'message' => 'Your travel allowance request has been approved',
            'data' => json_encode(['ta_request_id' => $taRequest->id]),
            'is_read' => false,
        ]);

        return response()->json(['message' => 'TA request approved', 'data' => $taRequest]);
    }

    public function reject(Request $request, $id)
    {
        $user = Auth::user();

        if ($user->role !== 'Super Admin') {
            return response()->json(['message' => 'Only super admin can reject TA requests'], 403);
        }

        $taRequest = TARequest::findOrFail($id);

        if ($taRequest->status !== 'Applied') {
            return response()->json(['message' => 'Only applied requests can be rejected'], 400);
        }

        $validated = $request->validate([
            'approval_notes' => 'required|string|max:500',
        ]);

        $taRequest->update([
            'status' => 'Rejected',
            'approver_id' => $user->id,
            'approval_notes' => $validated['approval_notes'],
            'updated_by' => $user->id,
        ]);

        // Notify applicant
        Notification::create([
            'user_id' => $taRequest->user_id,
            'type' => 'ta_request_rejected',
            'title' => 'TA Request Rejected',
            'message' => 'Your travel allowance request has been rejected',
            'data' => json_encode(['ta_request_id' => $taRequest->id]),
            'is_read' => false,
        ]);

        return response()->json(['message' => 'TA request rejected', 'data' => $taRequest]);
    }

    public function markPaid(Request $request, $id)
    {
        $user = Auth::user();

        if ($user->role !== 'Super Admin') {
            return response()->json(['message' => 'Only super admin can mark as paid'], 403);
        }

        $taRequest = TARequest::findOrFail($id);

        if ($taRequest->status !== 'Approved') {
            return response()->json(['message' => 'Only approved requests can be marked as paid'], 400);
        }

        $validated = $request->validate([
            'is_paid' => 'required|boolean',
        ]);

        $taRequest->update([
            'is_paid' => $validated['is_paid'],
            'status' => $validated['is_paid'] ? 'Paid' : 'Unpaid',
            'paid_at' => $validated['is_paid'] ? now() : null,
            'updated_by' => $user->id,
        ]);

        // Notify applicant
        $message = $validated['is_paid'] ? 'Your travel allowance has been paid' : 'Payment status has been updated';
        Notification::create([
            'user_id' => $taRequest->user_id,
            'type' => 'ta_request_paid',
            'title' => 'TA Payment Update',
            'message' => $message,
            'data' => json_encode(['ta_request_id' => $taRequest->id]),
            'is_read' => false,
        ]);

        return response()->json(['message' => 'Payment status updated', 'data' => $taRequest]);
    }

    public function adminIndex(Request $request)
    {
        $user = Auth::user();

        if ($user->role !== 'Super Admin') {
            return response()->json(['message' => 'Only super admin can view all requests'], 403);
        }

        $query = TARequest::with('user', 'items', 'approver');

        $status = $request->query('status');
        if ($status) {
            if ($status === 'pending') {
                $query->where('status', 'Applied');
            } elseif ($status === 'approved_unpaid') {
                $query->where('status', 'Approved')->where('is_paid', false);
            } elseif ($status === 'paid') {
                $query->where('is_paid', true);
            } else {
                $query->where('status', $status);
            }
        }

        $requests = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json([
            'data' => $requests->items(),
            'meta' => [
                'total' => $requests->total(),
                'per_page' => $requests->perPage(),
                'current_page' => $requests->currentPage(),
                'last_page' => $requests->lastPage(),
            ],
        ]);
    }

    public function emailApprove(Request $request, TARequest $taRequest)
    {
        // Verify signature - no auth required, but URL must be signed
        if (!$request->hasValidSignature()) {
            return response()->json(['message' => 'Invalid or expired link'], 401);
        }

        // Get frontend URL from environment or config
        $frontendUrl = env('FRONTEND_URL', config('app.frontend_url', 'http://localhost:3000'));

        // Redirect to frontend TA management page with the request ID
        return redirect("{$frontendUrl}/ta/management?action=approve&id={$taRequest->id}");
    }

    public function emailReject(Request $request, TARequest $taRequest)
    {
        // Verify signature - no auth required, but URL must be signed
        if (!$request->hasValidSignature()) {
            return response()->json(['message' => 'Invalid or expired link'], 401);
        }

        // Get frontend URL from environment or config
        $frontendUrl = env('FRONTEND_URL', config('app.frontend_url', 'http://localhost:3000'));

        // Redirect to frontend TA management page with the request ID
        return redirect("{$frontendUrl}/ta/management?action=reject&id={$taRequest->id}");
    }
}
