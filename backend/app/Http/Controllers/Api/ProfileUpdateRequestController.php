<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProfileUpdateRequest;
use App\Models\User;
use App\Notifications\ProfileUpdateRequestNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ProfileUpdateRequestController extends Controller
{
    // For Employee: Get their own pending request
    public function currentRequest()
    {
        $request = ProfileUpdateRequest::where('user_id', Auth::id())
            ->where('status', 'Pending')
            ->first();

        return response()->json(['data' => $request]);
    }

    // For Employee: Submit a new request
    public function storeRequest(Request $request)
    {
        // Cancel any existing pending request
        ProfileUpdateRequest::where('user_id', Auth::id())
            ->where('status', 'Pending')
            ->update(['status' => 'Rejected', 'reviewed_by' => Auth::id(), 'reviewed_at' => now()]);

        $validated = $request->validate([
            'phone'             => 'nullable|string|max:20',
            'emergency_contact' => 'nullable|string|max:20',
            'address'           => 'nullable|string',
            'city'              => 'nullable|string|max:100',
            'state'             => 'nullable|string|max:100',
            'zip'               => 'nullable|string|max:20',
        ]);

        $updateRequest = ProfileUpdateRequest::create([
            'user_id'        => Auth::id(),
            'requested_data' => $validated,
            'status'         => 'Pending',
        ]);

        // ── Notify all Super Admins ───────────────────────────────────
        try {
            $employee = Auth::user();
            $employeeName = trim("{$employee->first_name} {$employee->last_name}");

            // Find all Super Admins via Spatie roles or role column
            $superAdmins = User::where(function ($query) {
                $query->whereHas('roles', function ($q) {
                    $q->whereIn('name', ['Super Admin', 'super admin', 'Admin', 'admin']);
                });
                if (\Illuminate\Support\Facades\Schema::hasColumn('users', 'role')) {
                    $query->orWhereRaw('LOWER(role) IN (?, ?)', ['super admin', 'admin']);
                }
            })->get();

            // Fallback if role mapping differs in environment
            if ($superAdmins->isEmpty()) {
                $superAdmins = User::all()->filter(function ($u) {
                    return (method_exists($u, 'hasRole') && ($u->hasRole('Super Admin') || $u->hasRole('Admin')))
                        || in_array(strtolower($u->role ?? ''), ['super admin', 'admin'], true)
                        || $u->primaryRoleName() === 'Super Admin'
                        || str_starts_with(strtolower($u->email ?? ''), 'admin@');
                });
            }

            foreach ($superAdmins as $admin) {
                if ($admin->id !== $employee->id) {
                    $admin->notify(new ProfileUpdateRequestNotification(
                        'submitted',
                        $updateRequest,
                        "{$employeeName} has submitted a profile update request and is awaiting your approval."
                    ));
                }
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Failed to notify super admins of profile update request: ' . $e->getMessage());
        }
        // ─────────────────────────────────────────────────────────────

        return response()->json([
            'message' => 'Profile update request submitted successfully.',
            'data'    => $updateRequest,
        ]);
    }

    // For Admin: List all pending requests
    public function index()
    {
        $requests = ProfileUpdateRequest::with('user:id,first_name,last_name,email,profile_photo_path,employee_code')
            ->where('status', 'Pending')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $requests]);
    }

    // For Admin: Approve
    public function approve(ProfileUpdateRequest $profileRequest)
    {
        if ($profileRequest->status !== 'Pending') {
            return response()->json(['message' => 'Request is not pending.'], 400);
        }

        $user = $profileRequest->user;
        $user->update($profileRequest->requested_data);

        $profileRequest->update([
            'status'      => 'Approved',
            'reviewed_by' => Auth::id(),
            'reviewed_at' => now(),
        ]);

        // ── Notify the employee ───────────────────────────────────────
        try {
            $user->notify(new ProfileUpdateRequestNotification(
                'approved',
                $profileRequest,
                'Your profile update request has been approved. Your contact details are now updated.'
            ));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Failed to notify employee of profile update approval: ' . $e->getMessage());
        }
        // ─────────────────────────────────────────────────────────────

        return response()->json(['message' => 'Request approved and profile updated.']);
    }

    // For Admin: Reject
    public function reject(ProfileUpdateRequest $profileRequest)
    {
        if ($profileRequest->status !== 'Pending') {
            return response()->json(['message' => 'Request is not pending.'], 400);
        }

        $profileRequest->update([
            'status'      => 'Rejected',
            'reviewed_by' => Auth::id(),
            'reviewed_at' => now(),
        ]);

        // ── Notify the employee ───────────────────────────────────────
        try {
            $user = $profileRequest->user;
            $user->notify(new ProfileUpdateRequestNotification(
                'rejected',
                $profileRequest,
                'Your profile update request has been rejected by the admin. Please contact HR for more information.'
            ));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Failed to notify employee of profile update rejection: ' . $e->getMessage());
        }
        // ─────────────────────────────────────────────────────────────

        return response()->json(['message' => 'Request rejected.']);
    }
}
