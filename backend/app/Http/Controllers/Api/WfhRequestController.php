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
    public function diagnose()
    {
        $columns = \Illuminate\Support\Facades\Schema::getColumnListing('wfh_requests');
        return response()->json([
            'table' => 'wfh_requests',
            'columns' => $columns,
            'required_columns' => ['wfh_type_id', 'attachment_link', 'start_date', 'end_date', 'tl_status', 'admin_status'],
            'missing' => array_diff(['wfh_type_id', 'attachment_link', 'start_date', 'end_date', 'tl_status', 'admin_status'], $columns)
        ]);
    }

    public function index(Request $request)
    {
        $user  = $request->user();
        $query = WfhRequest::with(['user', 'approver']);

        // Check for delegated employee approver overrides
        $allOverrides = \App\Models\EmailSetting::getByKey('employee_overrides', []);
        $delegatedEmployeeIds = collect($allOverrides)
            ->filter(function ($item) use ($user) {
                return ($item['enabled'] ?? true) && (
                    (int)($item['approver_user_id'] ?? 0) === (int)$user->id ||
                    (int)($item['approver_user_id_2'] ?? 0) === (int)$user->id
                );
            })
            ->pluck('user_id')
            ->unique()
            ->values()
            ->all();

        $redirectedAwayEmployeeIds = collect($allOverrides)
            ->filter(function ($item) use ($user) {
                return ($item['enabled'] ?? true) &&
                    (!empty($item['approver_user_id']) || !empty($item['approver_user_id_2'])) &&
                    (int)($item['approver_user_id'] ?? 0) !== (int)$user->id &&
                    (int)($item['approver_user_id_2'] ?? 0) !== (int)$user->id;
            })
            ->pluck('user_id')
            ->unique()
            ->values()
            ->all();

        if ($user->hasRole('Super Admin') || $user->hasRole('HR')) {
            if ($request->has('status') && $request->status === 'Pending') {
                // Admin sees requests where TL has acted and admin is still pending
                $query->where('admin_status', 'Pending')
                      ->whereIn('tl_status', ['Approved', 'Not Required'])
                      ->where('status', 'Pending');
            } elseif ($request->has('status')) {
                $query->where('status', $request->status);
            }
        } elseif ($user->hasRole('Team Lead') || !empty($delegatedEmployeeIds)) {
            $teamId = $user->team_id;
            $query->where(function ($mainQ) use ($user, $teamId, $delegatedEmployeeIds, $redirectedAwayEmployeeIds) {
                if ($user->hasRole('Team Lead')) {
                    $mainQ->where(function ($subQ) use ($teamId, $redirectedAwayEmployeeIds) {
                        $subQ->whereHas('user', fn($uq) => $uq->where('team_id', $teamId));
                        if (!empty($redirectedAwayEmployeeIds)) {
                            $subQ->whereNotIn('user_id', $redirectedAwayEmployeeIds);
                        }
                    });
                }
                if (!empty($delegatedEmployeeIds)) {
                    if ($user->hasRole('Team Lead')) {
                        $mainQ->orWhereIn('user_id', $delegatedEmployeeIds);
                    } else {
                        $mainQ->whereIn('user_id', $delegatedEmployeeIds);
                    }
                }
            });

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

        // Enforce same-day cutoff time from policy
        $todayStr = \Carbon\Carbon::today('Asia/Kolkata')->toDateString();
        if ($data['start_date'] === $todayStr && !$user->hasRole('Super Admin') && !$user->hasRole('HR')) {
            $policy = \App\Models\LeavePolicySetting::current();
            $morningCutoff = $policy->wfh_morning_cutoff_time ?? '09:45';
            $afternoonCutoff = $policy->wfh_afternoon_cutoff_time ?? '14:30';

            $nowIst = \Carbon\Carbon::now('Asia/Kolkata');
            $nowMin = $nowIst->hour * 60 + $nowIst->minute;

            $mParts = explode(':', $morningCutoff);
            $morningCutoffMin = (int)($mParts[0] ?? 9) * 60 + (int)($mParts[1] ?? 45);

            $aParts = explode(':', $afternoonCutoff);
            $afternoonCutoffMin = (int)($aParts[0] ?? 14) * 60 + (int)($aParts[1] ?? 30);

            if (in_array($data['duration_type'], ['Full', 'Half-Morning']) && $nowMin > $morningCutoffMin) {
                return response()->json([
                    'message' => "Same-day Full Day / Morning WFH must be applied before {$morningCutoff}."
                ], 422);
            }

            if ($data['duration_type'] === 'Half-Afternoon' && $nowMin > $afternoonCutoffMin) {
                return response()->json([
                    'message' => "Same-day Afternoon WFH must be applied before {$afternoonCutoff}."
                ], 422);
            }
        }

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

        // Send in-app notifications if pending
        if ($status === 'Pending') {
            try {
                $fullName = "{$user->first_name} {$user->last_name}";
                $message  = "{$fullName} has submitted a WFH request ({$data['start_date']} to {$endDate}).";

                // Check for custom approver overrides
                $overrides = \App\Models\EmailSetting::getByKey('employee_overrides', []);
                $matchedOverride = collect($overrides)->first(function ($item) use ($user) {
                    return (int)($item['user_id'] ?? 0) === (int)$user->id && ($item['enabled'] ?? true);
                });

                $approverIds = [];
                if ($matchedOverride) {
                    if (!empty($matchedOverride['approver_user_id'])) $approverIds[] = (int)$matchedOverride['approver_user_id'];
                    if (!empty($matchedOverride['approver_user_id_2'])) $approverIds[] = (int)$matchedOverride['approver_user_id_2'];
                }

                if (!empty($approverIds)) {
                    $approvers = User::whereIn('id', $approverIds)->get();
                    foreach ($approvers as $appr) {
                        if ($appr->id !== $user->id) {
                            $appr->notify(new WfhRequestNotification('submitted', $wfhRequest, $message));
                        }
                    }
                } elseif ($tlStatus === 'Pending') {
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

            // Send email notifications (isolated, failures don't affect WFH creation)
            try {
                \App\Services\Email\EmailService::sendWfhRequestEmail($wfhRequest);
            } catch (\Exception $e) {
                \Log::warning('Email notification failed for WFH request: ' . $e->getMessage());
            }
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

        // Check for delegated employee approver overrides
        $allOverrides = \App\Models\EmailSetting::getByKey('employee_overrides', []);
        $isCustomApprover = collect($allOverrides)->contains(function ($item) use ($applicant, $user) {
            return ($item['enabled'] ?? true) &&
                (int)($item['user_id'] ?? 0) === (int)$applicant->id &&
                (
                    (int)($item['approver_user_id'] ?? 0) === (int)$user->id ||
                    (int)($item['approver_user_id_2'] ?? 0) === (int)$user->id
                );
        });

        $hasAnotherApproverDelegated = collect($allOverrides)->contains(function ($item) use ($applicant, $user) {
            return ($item['enabled'] ?? true) &&
                (int)($item['user_id'] ?? 0) === (int)$applicant->id &&
                (!empty($item['approver_user_id']) || !empty($item['approver_user_id_2'])) &&
                (int)($item['approver_user_id'] ?? 0) !== (int)$user->id &&
                (int)($item['approver_user_id_2'] ?? 0) !== (int)$user->id;
        });

        // Authorization check
        if ($user->hasRole('Super Admin') || $user->hasRole('HR')) {
            // Always authorized
        } elseif ($isCustomApprover) {
            // Authorized delegated custom approver for this employee
            if ($wfhRequest->tl_status !== 'Pending') {
                return response()->json(['message' => 'You have already acted on this request.'], 400);
            }
        } elseif ($user->hasRole('Team Lead')) {
            if ($hasAnotherApproverDelegated) {
                return response()->json(['message' => 'Approval for this employee has been redirected to a dedicated custom manager.'], 403);
            }
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

        $isInitialApproverRole = $user->hasRole('Team Lead') || $isCustomApprover;

        $newStatus = $data['status']; // 'Approved' or 'Rejected'

        if ($newStatus === 'Rejected') {
            // Either party rejects → immediately rejected
            $wfhRequest->update([
                'status'       => 'Rejected',
                'tl_status'    => $isInitialApproverRole ? 'Rejected' : $wfhRequest->tl_status,
                'admin_status' => ($user->hasRole('Super Admin') || $user->hasRole('HR')) ? 'Rejected' : $wfhRequest->admin_status,
                'approved_by'  => $user->id,
                'remarks'      => $data['remarks'] ?? null,
            ]);
        } else {
            // Approval — dual approval required
            if ($isInitialApproverRole && !$user->hasRole('Super Admin') && !$user->hasRole('HR')) {
                $wfhRequest->tl_status = 'Approved';
                // Status stays Pending until Admin also approves
                $wfhRequest->save();

                // Notify Super Admins that initial approver has approved — their turn
                try {
                    $apprName = "{$user->first_name} {$user->last_name}";
                    $empName  = "{$applicant->first_name} {$applicant->last_name}";
                    $msg      = "Approver {$apprName} has approved {$empName}'s WFH request. Awaiting your final approval.";
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

    // Admin-initiated WFH creation for any employee
    public function storeForEmployee(\App\Http\Requests\StoreAdminWfhRequest $request)
    {
        \Log::info('=== WFH CREATION START ===');
        \Log::info('Request data received', ['all' => $request->all()]);

        try {
            $data = $request->validated();
            \Log::info('Validation passed', ['data' => $data]);
        } catch (\Exception $ve) {
            \Log::error('Validation failed', ['error' => $ve->getMessage()]);
            return response()->json(['message' => 'Validation error: ' . $ve->getMessage(), 'error' => $ve->getMessage()], 422);
        }

        $admin = $request->user();
        \Log::info('Admin user', ['admin_id' => $admin->id ?? null]);

        $targetUser = User::find($data['user_id']);
        \Log::info('Target user lookup', ['target_id' => $data['user_id'], 'found' => $targetUser ? 'yes' : 'no']);

        if (!$targetUser) {
            return response()->json(['message' => 'Employee not found.'], 404);
        }

        // Check for overlapping WFH
        $overlap = WfhRequest::where('user_id', $targetUser->id)
            ->whereIn('status', ['Pending', 'Approved'])
            ->where(function($q) use ($data) {
                $q->whereBetween('start_date', [$data['start_date'], $data['end_date']])
                  ->orWhereBetween('end_date', [$data['start_date'], $data['end_date']])
                  ->orWhere(function($sq) use ($data) {
                      $sq->where('start_date', '<=', $data['start_date'])
                         ->where('end_date', '>=', $data['end_date']);
                  });
            })
            ->first();

        if ($overlap) {
            return response()->json([
                'message' => 'Employee already has WFH on some dates within this range (' . $overlap->start_date . ' to ' . $overlap->end_date . ').'
            ], 422);
        }

        $durationType = $data['duration_type'] ?? 'Full';
        $autoApprove = $data['auto_approve'] ?? true;

        $wfhRequest = null;
        DB::beginTransaction();
        try {
            $wfhRequest = WfhRequest::create([
                'user_id'      => $targetUser->id,
                'wfh_date'     => $data['start_date'],  // legacy NOT NULL column fallback
                'wfh_type_id'  => $data['wfh_type_id'],
                'start_date'   => $data['start_date'],
                'end_date'     => $data['end_date'],
                'reason'       => $data['reason'] . ' [Created by Admin]',
                'attachment_link' => $data['attachment_link'] ?? null,
                'duration_type' => $durationType,
                'status'       => $autoApprove ? 'Approved' : 'Pending',
                'tl_status'    => $autoApprove ? 'Not Required' : 'Pending',
                'admin_status' => $autoApprove ? 'Approved' : 'Pending',
                'approved_by'  => $autoApprove ? $admin->id : null,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'WFH created successfully' . ($autoApprove ? ' and auto-approved.' : '.'),
                'data'    => new \App\Http\Resources\WfhRequestResource($wfhRequest)
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('WFH creation failed', [
                'user_id' => $data['user_id'] ?? null,
                'wfh_type_id' => $data['wfh_type_id'] ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Failed to create WFH: ' . $e->getMessage(),
                'error' => $e->getMessage(),
                'debug' => config('app.debug') ? $e->getTraceAsString() : null
            ], 500);
        }
    }

    /**
     * Cancel a pending WFH request by the applicant or Super Admin.
     */
    public function cancel(Request $request, WfhRequest $wfhRequest)
    {
        $user = $request->user();

        if ($wfhRequest->user_id !== $user->id && !$user->hasRole('Super Admin')) {
            return response()->json(['message' => 'Unauthorized to cancel this WFH request.'], 403);
        }

        if ($wfhRequest->status !== 'Pending') {
            return response()->json(['message' => "Only pending requests can be cancelled. Current status is {$wfhRequest->status}."], 422);
        }

        $wfhRequest->update([
            'status'       => 'Cancelled',
            'tl_status'    => 'Cancelled',
            'admin_status' => 'Cancelled',
            'approved_by'  => $user->id,
        ]);

        return response()->json([
            'message' => 'WFH request cancelled successfully.',
            'data'    => $wfhRequest->fresh(['user', 'approver']),
        ]);
    }
}
