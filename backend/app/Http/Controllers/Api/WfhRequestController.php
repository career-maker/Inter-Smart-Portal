<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WfhRequest;
use App\Http\Requests\StoreWfhRequest;
use App\Http\Requests\UpdateLeaveStatusRequest;
use Illuminate\Http\Request;

class WfhRequestController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = WfhRequest::with(['user', 'approver']);

        // Employees see their own. Team Leads see their team's. Admins/HR see all.
        if ($user->hasRole('Super Admin') || $user->hasRole('HR')) {
            if ($request->has('status') && $request->status === 'Pending') {
                $query->where('admin_status', 'Pending')
                      ->whereIn('tl_status', ['Approved', 'Not Required']);
            } elseif ($request->has('status')) {
                $query->where('status', $request->status);
            }
        } elseif ($user->hasRole('Team Lead')) {
            $teamId = $user->team_id;
            $query->whereHas('user', function ($q) use ($teamId) {
                $q->where('team_id', $teamId);
            });
            if ($request->has('status') && $request->status === 'Pending') {
                $query->where('tl_status', 'Pending');
            } elseif ($request->has('status')) {
                $query->where('status', $request->status);
            }
        } else {
            // Default: Employees see their own.
            $query->where('user_id', $user->id);
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }
        }

        return response()->json([
            'data' => $query->orderBy('created_at', 'desc')->paginate(10)
        ]);
    }

    public function store(StoreWfhRequest $request)
    {
        $user = $request->user();
        $data = $request->validated();
        
        $tlStatus = 'Pending';
        $adminStatus = 'Pending';
        
        // If the user is a Team Lead, they don't need TL approval, just Super Admin
        if ($user->hasRole('Team Lead')) {
            $tlStatus = 'Not Required';
        }
        
        // If the user is Super Admin
        if ($user->hasRole('Super Admin') || $user->hasRole('HR')) {
            $tlStatus = 'Not Required';
        }

        $wfhRequest = WfhRequest::create([
            'user_id' => $user->id,
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'reason' => $data['reason'],
            'status' => 'Pending',
            'tl_status' => $tlStatus,
            'admin_status' => $adminStatus,
        ]);

        return response()->json([
            'message' => 'WFH request applied successfully',
            'data' => $wfhRequest
        ], 201);
    }

    public function updateStatus(UpdateLeaveStatusRequest $request, WfhRequest $wfhRequest)
    {
        $user = $request->user();
        $data = $request->validated();

        if ($wfhRequest->status !== 'Pending') {
            return response()->json(['message' => 'Only pending requests can be updated'], 400);
        }

        $applicant = $wfhRequest->user;
        
        if ($user->hasRole('Super Admin') || $user->hasRole('HR')) {
            // Authorized
        } elseif ($user->hasRole('Team Lead')) {
            if ($applicant->team_id !== $user->team_id) {
                return response()->json(['message' => 'Unauthorized to approve this request.'], 403);
            }
            if ($applicant->hasRole('Team Lead')) {
                return response()->json(['message' => 'Team Lead requests must be approved by a Super Admin.'], 403);
            }
        } else {
            return response()->json(['message' => 'Unauthorized to approve requests.'], 403);
        }

        $status = $data['status']; // 'Approved' or 'Rejected'
        
        if ($status === 'Rejected') {
            $wfhRequest->update([
                'status' => 'Rejected',
                'tl_status' => $user->hasRole('Team Lead') ? 'Rejected' : $wfhRequest->tl_status,
                'admin_status' => ($user->hasRole('Super Admin') || $user->hasRole('HR')) ? 'Rejected' : $wfhRequest->admin_status,
                'approved_by' => $user->id,
                'remarks' => $data['remarks'] ?? null
            ]);
        } else if ($status === 'Approved') {
            if ($user->hasRole('Team Lead') && !$user->hasRole('Super Admin') && !$user->hasRole('HR')) {
                $wfhRequest->tl_status = 'Approved';
                
                if ($wfhRequest->admin_status === 'Not Required') {
                    $wfhRequest->status = 'Approved';
                    $wfhRequest->approved_by = $user->id;
                }
            } else if ($user->hasRole('Super Admin') || $user->hasRole('HR')) {
                $wfhRequest->admin_status = 'Approved';
                
                if ($wfhRequest->tl_status === 'Approved' || $wfhRequest->tl_status === 'Not Required') {
                    $wfhRequest->status = 'Approved';
                }
                $wfhRequest->approved_by = $user->id;
            }
            $wfhRequest->save();
        }

        return response()->json([
            'message' => "WFH request {$data['status']} successfully",
            'data' => $wfhRequest
        ]);
    }
}
