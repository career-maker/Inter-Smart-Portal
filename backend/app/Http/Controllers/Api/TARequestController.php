<?php

namespace App\Http\Controllers\Api;

use App\Models\TARequest;
use App\Models\TARequestItem;
use App\Models\User;
use App\Notifications\TARequestNotification;
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

        if (!$user->hasRole('Super Admin')) {
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

        if (!$user->hasRole('Super Admin') && $request->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($request);
    }

    public function store(Request $request)
    {
        try {
            $user = Auth::user();

            $rawItems = $request->input('items');
            if (is_string($rawItems)) {
                $decoded = json_decode($rawItems, true);
                if (is_array($decoded)) {
                    $request->merge(['items' => $decoded]);
                }
            }

            $validated = $request->validate([
                'reason' => 'required|string|max:1000',
                'date_travelled' => 'required|date',
                'items' => 'required|array|min:1',
                'items.*.category' => 'required|string',
                'items.*.amount' => 'required|numeric|min:0',
                'items.*.description' => 'nullable|string',
                'bill_link' => 'nullable|string|max:1000',
                'receipt_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf,heic|max:10240',
                'receipt_photo' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf,heic|max:10240',
            ]);

            $billLink = $validated['bill_link'] ?? null;

            $uploadedFile = $request->file('receipt_file') ?: $request->file('receipt_photo');
            if ($uploadedFile) {
                $storedPath = $uploadedFile->store('ta_receipts', 'public');
                $billLink = asset('storage/' . $storedPath);
            }

            $totalAmount = collect($validated['items'])->sum('amount');

            $taRequest = TARequest::create([
                'user_id' => $user->id,
                'reason' => $validated['reason'],
                'date_travelled' => $validated['date_travelled'],
                'total_amount' => $totalAmount,
                'bill_link' => $billLink,
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
        } catch (\Illuminate\Database\QueryException $e) {
            \Log::error('Database error creating TA request: ' . $e->getMessage());
            return response()->json([
                'message' => 'Database error: ' . $e->getMessage()
            ], 500);
        } catch (\Exception $e) {
            \Log::error('Error creating TA request: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error: ' . $e->getMessage()
            ], 500);
        }

        // Send in-app notification to all Super Admins
        try {
            $applicantName = "{$user->first_name} {$user->last_name}";
            $claimAmount = number_format((float)$taRequest->total_amount, 2);
            $msg = "{$applicantName} submitted a Travel Allowance request for ₹{$claimAmount}";

            $superAdmins = User::role('Super Admin')->get();
            foreach ($superAdmins as $admin) {
                $admin->notify(new TARequestNotification(
                    $taRequest,
                    $msg,
                    'New Travel Allowance Request',
                    'ta_requested',
                    '/ta/management'
                ));
            }
        } catch (\Exception $e) {
            \Log::error('Failed to create in-app TA notification: ' . $e->getMessage());
        }

        // Send email to HR and admin (non-blocking - don't fail if email fails)
        try {
            $approveUrl = URL::signedRoute('ta-request.email-approve', ['taRequest' => $taRequest->id]);
            $rejectUrl = URL::signedRoute('ta-request.email-reject', ['taRequest' => $taRequest->id]);

            $emailData = [
                'employee_name' => "{$user->first_name} {$user->last_name}",
                'approve_url' => $approveUrl,
                'reject_url' => $rejectUrl,
            ];

            // Send dynamic TA request email via EmailService
            \App\Services\Email\EmailService::sendTARequestEmail($taRequest, $emailData);
        } catch (\Exception $e) {
            // Log the error but don't fail the request
            \Log::error('Failed to send TA request email: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'TA request submitted successfully',
            'data' => $taRequest->load('items'),
        ], 201);
    }

    public function approve(Request $request, $id)
    {
        $user = Auth::user();

        if (!$user->hasRole('Super Admin')) {
            return response()->json(['message' => 'Only super admin can approve TA requests'], 403);
        }

        $taRequest = TARequest::with(['user', 'items'])->findOrFail($id);

        if ($taRequest->status === 'Paid') {
            return response()->json(['message' => 'Cannot approve a claim that has already been paid and settled.'], 422);
        }
        if ($taRequest->status === 'Cancelled') {
            return response()->json(['message' => 'Cannot approve a claim that was cancelled.'], 422);
        }
        if ($taRequest->status === 'Rejected') {
            return response()->json(['message' => 'Cannot directly approve a rejected request. Please use Override to adjust rejected requests.'], 422);
        }

        $validated = $request->validate([
            'approval_notes' => 'nullable|string|max:500',
            'approved_amount' => 'nullable|numeric|min:0',
            'is_paid' => 'nullable|boolean',
            'payment_mode' => 'nullable|string|max:50',
            'payment_receipt_link' => 'nullable|string|max:1000',
            'payment_receipt_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf,heic|max:10240',
            'payment_screenshot' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf,heic|max:10240',
        ]);

        $approvedAmount = isset($validated['approved_amount']) && $validated['approved_amount'] !== '' 
            ? (float)$validated['approved_amount'] 
            : (float)$taRequest->total_amount;

        $paymentReceiptLink = $validated['payment_receipt_link'] ?? $taRequest->payment_receipt_link;

        $uploadedProof = $request->file('payment_receipt_file') ?: $request->file('payment_screenshot');
        if ($uploadedProof) {
            $storedPath = $uploadedProof->store('ta_payments', 'public');
            $paymentReceiptLink = asset('storage/' . $storedPath);
        }

        $receiptNumber = $taRequest->receipt_number ?: ('TA-REC-' . date('Y') . '-' . str_pad($taRequest->id, 5, '0', STR_PAD_LEFT));
        $isPaid = filter_var($validated['is_paid'] ?? false, FILTER_VALIDATE_BOOLEAN);

        $taRequest->update([
            'status' => $isPaid ? 'Paid' : 'Approved',
            'approver_id' => $user->id,
            'approval_notes' => $validated['approval_notes'] ?? $taRequest->approval_notes,
            'approved_amount' => $approvedAmount,
            'receipt_number' => $receiptNumber,
            'payment_receipt_link' => $paymentReceiptLink,
            'payment_mode' => $validated['payment_mode'] ?? $taRequest->payment_mode ?? ($isPaid ? 'Bank Transfer' : null),
            'is_paid' => $isPaid,
            'paid_at' => $isPaid ? ($taRequest->paid_at ?: now()) : null,
            'updated_by' => $user->id,
        ]);

        // Notify applicant via In-App Notification
        try {
            $claimAmount = number_format($approvedAmount, 2);
            $msg = "Your Travel Allowance request #{$receiptNumber} for ₹{$claimAmount} has been approved" . ($isPaid ? " and marked Paid" : "");
            $taRequest->user->notify(new TARequestNotification(
                $taRequest,
                $msg,
                'TA Request Approved',
                'ta_approved',
                '/ta/status'
            ));
        } catch (\Exception $e) {
            \Log::error('Failed to notify applicant on TA approval: ' . $e->getMessage());
        }

        // Send Approval & Receipt Email via EmailService
        try {
            $emailData = [
                'employee_name' => "{$taRequest->user->first_name} {$taRequest->user->last_name}",
            ];
            \App\Services\Email\EmailService::sendTAApprovedEmail($taRequest, $emailData);
        } catch (\Exception $e) {
            \Log::error('Failed to send TA approval email: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'TA request approved successfully',
            'data' => $taRequest->fresh(['user', 'items', 'approver'])
        ]);
    }

    /**
     * Override TA request by Super Admin
     */
    public function override(Request $request, $id)
    {
        $user = Auth::user();

        if (!$user->hasRole('Super Admin')) {
            return response()->json(['message' => 'Only super admin can override TA requests'], 403);
        }

        $taRequest = TARequest::with(['user', 'items'])->findOrFail($id);

        $rawItems = $request->input('items');
        if (is_string($rawItems)) {
            $decoded = json_decode($rawItems, true);
            if (is_array($decoded)) {
                $request->merge(['items' => $decoded]);
            }
        }

        $validated = $request->validate([
            'reason' => 'sometimes|required|string|max:1000',
            'date_travelled' => 'sometimes|required|date',
            'total_amount' => 'sometimes|numeric|min:0',
            'approved_amount' => 'nullable|numeric|min:0',
            'status' => 'sometimes|required|string|in:Applied,Approved,Rejected,Paid',
            'approval_notes' => 'nullable|string|max:1000',
            'is_paid' => 'nullable|boolean',
            'payment_mode' => 'nullable|string|max:50',
            'receipt_number' => 'nullable|string|max:50',
            'bill_link' => 'nullable|string|max:1000',
            'payment_receipt_link' => 'nullable|string|max:1000',
            'payment_receipt_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf,heic|max:10240',
            'receipt_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf,heic|max:10240',
            'items' => 'nullable|array',
            'items.*.category' => 'required_with:items|string',
            'items.*.amount' => 'required_with:items|numeric|min:0',
            'items.*.description' => 'nullable|string',
        ]);

        $paymentReceiptLink = $validated['payment_receipt_link'] ?? $taRequest->payment_receipt_link;
        if ($request->hasFile('payment_receipt_file')) {
            $storedPath = $request->file('payment_receipt_file')->store('ta_payments', 'public');
            $paymentReceiptLink = asset('storage/' . $storedPath);
        }

        $billLink = $validated['bill_link'] ?? $taRequest->bill_link;
        if ($request->hasFile('receipt_file')) {
            $storedBill = $request->file('receipt_file')->store('ta_receipts', 'public');
            $billLink = asset('storage/' . $storedBill);
        }

        // Update items breakdown if provided
        if (isset($validated['items']) && is_array($validated['items'])) {
            $taRequest->items()->delete();
            $totalCalc = 0;
            foreach ($validated['items'] as $item) {
                TARequestItem::create([
                    'ta_request_id' => $taRequest->id,
                    'category' => $item['category'],
                    'amount' => $item['amount'],
                    'description' => $item['description'] ?? null,
                ]);
                $totalCalc += (float)$item['amount'];
            }
            $taRequest->total_amount = $totalCalc;
        } elseif (isset($validated['total_amount'])) {
            $taRequest->total_amount = $validated['total_amount'];
        }

        if (isset($validated['reason'])) $taRequest->reason = $validated['reason'];
        if (isset($validated['date_travelled'])) $taRequest->date_travelled = $validated['date_travelled'];
        if (isset($validated['status'])) $taRequest->status = $validated['status'];
        if (isset($validated['approval_notes'])) $taRequest->approval_notes = $validated['approval_notes'];
        if (isset($validated['payment_mode'])) $taRequest->payment_mode = $validated['payment_mode'];
        
        $taRequest->bill_link = $billLink;
        $taRequest->payment_receipt_link = $paymentReceiptLink;
        $taRequest->approver_id = $user->id;
        $taRequest->updated_by = $user->id;

        if (isset($validated['approved_amount'])) {
            $taRequest->approved_amount = $validated['approved_amount'];
        } elseif (in_array($taRequest->status, ['Approved', 'Paid']) && empty($taRequest->approved_amount)) {
            $taRequest->approved_amount = $taRequest->total_amount;
        }

        if (in_array($taRequest->status, ['Approved', 'Paid']) && empty($taRequest->receipt_number)) {
            $taRequest->receipt_number = 'TA-REC-' . date('Y') . '-' . str_pad($taRequest->id, 5, '0', STR_PAD_LEFT);
        }

        if (isset($validated['is_paid'])) {
            $taRequest->is_paid = filter_var($validated['is_paid'], FILTER_VALIDATE_BOOLEAN);
            if ($taRequest->is_paid && empty($taRequest->paid_at)) {
                $taRequest->paid_at = now();
            }
        }

        $taRequest->save();

        // If status is Approved or Paid, notify and email applicant
        if (in_array($taRequest->status, ['Approved', 'Paid'])) {
            try {
                \App\Services\Email\EmailService::sendTAApprovedEmail($taRequest, [
                    'employee_name' => "{$taRequest->user->first_name} {$taRequest->user->last_name}",
                ]);
            } catch (\Throwable $e) {
                \Log::error('Failed to send TA override email: ' . $e->getMessage());
            }
        }
return response()->json([
            'message' => 'TA request overridden successfully',
            'data' => $taRequest->fresh(['user', 'items', 'approver'])
        ]);
    }

    public function reject(Request $request, $id)
    {
        $user = Auth::user();

        if (!$user->hasRole('Super Admin')) {
            return response()->json(['message' => 'Only super admin can reject TA requests'], 403);
        }

        $taRequest = TARequest::findOrFail($id);

        if ($taRequest->status === 'Paid') {
            return response()->json(['message' => 'Cannot reject a claim that has already been paid and settled.'], 422);
        }
        if ($taRequest->status === 'Cancelled') {
            return response()->json(['message' => 'Cannot reject a claim that was cancelled.'], 422);
        }
        if ($taRequest->status === 'Rejected') {
            return response()->json(['message' => 'This request is already rejected.'], 422);
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
        try {
            $msg = "Your Travel Allowance request has been rejected" . ($validated['approval_notes'] ? ": " . $validated['approval_notes'] : "");
            $taRequest->user->notify(new TARequestNotification(
                $taRequest,
                $msg,
                'TA Request Rejected',
                'ta_rejected',
                '/ta/status'
            ));
        } catch (\Exception $e) {
            \Log::error('Failed to notify applicant on TA rejection: ' . $e->getMessage());
        }

        return response()->json(['message' => 'TA request rejected', 'data' => $taRequest]);
    }

    public function markPaid(Request $request, $id)
    {
        $user = Auth::user();

        if (!$user->hasRole('Super Admin')) {
            return response()->json(['message' => 'Only super admin can mark as paid'], 403);
        }

        $taRequest = TARequest::with(['user', 'items'])->findOrFail($id);

        if ($taRequest->status === 'Rejected') {
            return response()->json(['message' => 'Cannot mark a rejected request as paid.'], 422);
        }
        if ($taRequest->status === 'Cancelled') {
            return response()->json(['message' => 'Cannot mark a cancelled request as paid.'], 422);
        }
        if ($taRequest->status === 'Applied') {
            return response()->json(['message' => 'Please approve the TA request first before marking it as paid.'], 422);
        }

        $validated = $request->validate([
            'is_paid' => 'required|boolean',
            'payment_mode' => 'nullable|string|max:50',
            'approval_notes' => 'nullable|string|max:500',
            'payment_receipt_link' => 'nullable|string|max:1000',
            'payment_receipt_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf,heic|max:10240',
        ]);

        $paymentReceiptLink = $validated['payment_receipt_link'] ?? $taRequest->payment_receipt_link;
        if ($request->hasFile('payment_receipt_file')) {
            $storedPath = $request->file('payment_receipt_file')->store('ta_payments', 'public');
            $paymentReceiptLink = asset('storage/' . $storedPath);
        }

        $receiptNumber = $taRequest->receipt_number ?: ('TA-REC-' . date('Y') . '-' . str_pad($taRequest->id, 5, '0', STR_PAD_LEFT));
        $approvedAmount = $taRequest->approved_amount ?: $taRequest->total_amount;

        $taRequest->update([
            'is_paid' => $validated['is_paid'],
            'status' => $validated['is_paid'] ? 'Paid' : 'Approved',
            'paid_at' => $validated['is_paid'] ? now() : null,
            'payment_mode' => $validated['payment_mode'] ?? $taRequest->payment_mode ?? 'Bank Transfer',
            'payment_receipt_link' => $paymentReceiptLink,
            'receipt_number' => $receiptNumber,
            'approved_amount' => $approvedAmount,
            'approval_notes' => $validated['approval_notes'] ?? $taRequest->approval_notes,
            'updated_by' => $user->id,
        ]);

        // Notify applicant
        try {
            $message = $validated['is_paid'] 
                ? "Your travel allowance #{$receiptNumber} for ₹" . number_format($approvedAmount, 2) . " has been paid & settled"
                : 'Payment status has been updated';

            $taRequest->user->notify(new TARequestNotification(
                $taRequest,
                $message,
                'TA Payment Update',
                'ta_paid',
                '/ta/status'
            ));

            if ($validated['is_paid']) {
                \App\Services\Email\EmailService::sendTAApprovedEmail($taRequest, [
                    'employee_name' => "{$taRequest->user->first_name} {$taRequest->user->last_name}",
                ]);
            }
        } catch (\Exception $e) {
            \Log::error('Failed to notify applicant on TA markPaid: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Payment status updated successfully',
            'data' => $taRequest->fresh(['user', 'items', 'approver'])
        ]);
    }

    /**
     * Cancel pending TA request by employee or Super Admin
     */
    public function cancel(Request $request, $id)
    {
        $user = Auth::user();
        $taRequest = TARequest::findOrFail($id);

        if ($taRequest->user_id !== $user->id && !$user->hasRole('Super Admin')) {
            return response()->json(['message' => 'Unauthorized to cancel this request.'], 403);
        }

        if (!in_array($taRequest->status, ['Applied', 'Pending'])) {
            return response()->json(['message' => "Only pending requests can be cancelled. Current status is {$taRequest->status}."], 422);
        }

        $taRequest->update([
            'status' => 'Cancelled',
            'updated_by' => $user->id,
        ]);

        return response()->json([
            'message' => 'Travel Allowance claim cancelled successfully.',
            'data' => $taRequest->fresh(['user', 'items']),
        ]);
    }

    public function adminIndex(Request $request)
    {
        $user = Auth::user();

        if (!$user->hasRole('Super Admin')) {
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
