<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WfhRequest;
use App\Models\User;
use App\Http\Requests\StoreWfhRequest;
use App\Http\Requests\UpdateLeaveStatusRequest;
use App\Notifications\WfhRequestNotification;
use Illuminate\Http\Request;

class WfhRequestController extends Controller
{
    public function index(Request $request)
    {
        $user  = $request->user();
        $query = WfhRequest::with(['user', 'approver']);

        if ($user->hasRole('Super Admin') || $user->hasRole('HR')) {
            if ($request->has('status') && $request->status === 'Pending') {
                // Admin sees requests where TL has acted and admin is still pending
                $query->where('admin_status', 'Pending')
                      ->whereIn('tl_status', ['Approved', 'Not Required'])
                      ->where('status', 'Pending');
            } elseif ($request->has('status')) {
                $query->where('status', $request->status);
            }
        } elseif ($user->hasRole('Team Lead')) {
            $teamId = $user->team_id;
            $query->whereHas('user', fn($q) => $q->where('team_id', $teamId));
            if ($request->has('status') && $request->status === 'Pending') {
                $query->where('tl_status', 'Pending')->where('status', 'Pending');
            } elseif ($request->has('status')) {
                $query->where('status', $request->status);
            }
        } else {
            $query->where('user_id', $user->id);
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }
        }

        return response()->json([
            'data' => $query->orderBy('created_at', 'desc')->paginate(20)
        ]);
    }

    public function store(StoreWfhRequest $request)
    {
        $user = $request->user();
        $data = $request->validated();

        // Determine approval status based on applicant's role
        $tlStatus    = 'Pending';
        $adminStatus = 'Pending';
        $status      = 'Pending';
        $approvedBy  = null;

        if ($user->hasRole('Super Admin') || $user->hasRole('HR')) {
            // Super Admin / HR auto-approved — no approval chain needed
            $tlStatus    = 'Not Required';
            $adminStatus = 'Not Required';
            $status      = 'Approved';
            $approvedBy  = $user->id;
        } elseif ($user->hasRole('Team Lead')) {
            // TL cannot approve their own WFH — skip TL step, send to Admin
            $tlStatus    = 'Not Required';
            $adminStatus = 'Pending';
        }
        // else: Employee → both TL and Admin need to approve

        // For half-day WFH, end_date = start_date
        $isHalfDay = in_array($data['duration_type'], ['Half-Morning', 'Half-Afternoon']);
        $endDate   = $isHalfDay ? $data['start_date'] : ($data['end_date'] ?? $data['start_date']);

        $wfhRequest = WfhRequest::create([
            'user_id'       => $user->id,
            'duration_type' => $data['duration_type'],
            'wfh_date'      => $data['start_date'],  // legacy NOT NULL column fallback
            'start_date'    => $data['start_date'],
            'end_date'      => $endDate,
            'reason'        => $data['reason'],
            'status'        => $status,
            'tl_status'     => $tlStatus,
            'admin_status'  => $adminStatus,
            'approved_by'   => $approvedBy,
        ]);

        // Notify relevant approvers
        if ($status === 'Pending') {
            try {
                $fullName = "{$user->first_name} {$user->last_name}";
                $message  = "{$fullName} has submitted a WFH request ({$data['start_date']} to {$endDate}).";

                if ($tlStatus === 'Pending') {
                    // Notify the employee's Team Lead
                    if ($user->team_id) {
                        $tl = \App\Models\Team::find($user->team_id)?->teamLead;
                        if ($tl && $tl->id !== $user->id) {
                            $tl->notify(new WfhRequestNotification('submitted', $wfhRequest, $message));
                        }
                    }
                } else {
                    // TL step skipped — notify Super Admin directly
                    foreach (User::role('Super Admin')->get() as $admin) {
                        if ($admin->id !== $user->id) {
                            $admin->notify(new WfhRequestNotification('submitted', $wfhRequest, $message));
                        }
                    }
                }
            } catch (\Exception $e) {}
        }

        return response()->json([
            'message' => 'WFH request submitted successfully',
            'data'    => $wfhRequest
        ], 201);
    }

    public function updateStatus(UpdateLeaveStatusRequest $request, WfhRequest $wfhRequest)
    {
        $user = $request->user();
        $data = $request->validated();

        if ($wfhRequest->status !== 'Pending') {
            return response()->json(['message' => 'Only pending requests can be updated.'], 400);
        }

        $applicant = $wfhRequest->user;

        // Authorization check
        if ($user->hasRole('Super Admin') || $user->hasRole('HR')) {
            // Always authorized
        } elseif ($user->hasRole('Team Lead')) {
            if ($applicant->team_id !== $user->team_id) {
                return response()->json(['message' => 'Unauthorized to approve this request.'], 403);
            }
            if ($applicant->hasRole('Team Lead')) {
                return response()->json(['message' => 'Team Lead WFH requests must be approved by a Super Admin.'], 403);
            }
            if ($wfhRequest->tl_status !== 'Pending') {
                return response()->json(['message' => 'You have already acted on this request.'], 400);
            }
        } else {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $newStatus = $data['status']; // 'Approved' or 'Rejected'

        if ($newStatus === 'Rejected') {
            // Either party rejects → immediately rejected
            $wfhRequest->update([
                'status'       => 'Rejected',
                'tl_status'    => $user->hasRole('Team Lead') ? 'Rejected' : $wfhRequest->tl_status,
                'admin_status' => ($user->hasRole('Super Admin') || $user->hasRole('HR')) ? 'Rejected' : $wfhRequest->admin_status,
                'approved_by'  => $user->id,
                'remarks'      => $data['remarks'] ?? null,
            ]);
        } else {
            // Approval — dual approval required
            if ($user->hasRole('Team Lead') && !$user->hasRole('Super Admin')) {
                $wfhRequest->tl_status = 'Approved';
                // Status stays Pending until Admin also approves
                $wfhRequest->save();

                // Notify Super Admins that TL has approved — their turn
                try {
                    $tlName  = "{$user->first_name} {$user->last_name}";
                    $empName = "{$applicant->first_name} {$applicant->last_name}";
                    $msg     = "TL {$tlName} has approved {$empName}'s WFH request. Awaiting your final approval.";
                    foreach (User::role('Super Admin')->get() as $admin) {
                        $admin->notify(new WfhRequestNotification('tl_approved', $wfhRequest, $msg));
                    }
                } catch (\Exception $e) {}

            } elseif ($user->hasRole('Super Admin') || $user->hasRole('HR')) {
                $wfhRequest->admin_status = 'Approved';
                $wfhRequest->approved_by  = $user->id;

                // Finalize only when TL has also approved (or is not required)
                if (in_array($wfhRequest->tl_status, ['Approved', 'Not Required'])) {
                    $wfhRequest->status = 'Approved';
                }
                $wfhRequest->save();
            }
        }

        // Notify the applicant of outcome
        try {
            $actorName = "{$user->first_name} {$user->last_name}";
            if ($newStatus === 'Approved' && $wfhRequest->status === 'Approved') {
                $msg   = "Your WFH request has been fully approved by {$actorName}.";
                $event = 'approved';
            } elseif ($newStatus === 'Rejected') {
                $msg   = "Your WFH request has been rejected by {$actorName}.";
                $event = 'rejected';
            } else {
                // TL approved but still awaiting Admin — don't notify employee yet
                $msg   = null;
                $event = null;
            }
            if ($msg) {
                $wfhRequest->user->notify(new WfhRequestNotification($event, $wfhRequest, $msg));
            }
        } catch (\Exception $e) {}

        return response()->json([
            'message' => "WFH request {$newStatus} successfully.",
            'data'    => $wfhRequest->fresh(),
        ]);
    }
}
