<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    /**
     * Get all notifications for the authenticated user
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        $this->autoHealAdminNotifications($user);

        $perPage = $request->input('per_page', 20);
        
        // Use standard database notifications
        $notifications = $user->notifications()->paginate($perPage);
        
        return response()->json([
            'status' => 'success',
            'data' => $notifications
        ]);
    }

    /**
     * Get unread notifications for the authenticated user
     */
    public function unread(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        $this->autoHealAdminNotifications($user);

        $limit = $request->input('limit', 5);
        
        $notifications = $user->unreadNotifications()->limit($limit)->get();
        $count = $user->unreadNotifications()->count();
        
        return response()->json([
            'status' => 'success',
            'data' => [
                'notifications' => $notifications,
                'count' => $count
            ]
        ]);
    }

    /**
     * Auto-heal missing notifications for Super Admin / HR when approver rejected a request
     */
    private function autoHealAdminNotifications($user): void
    {
        if (!$user || !($user->hasRole('Super Admin') || $user->hasRole('HR'))) {
            return;
        }

        try {
            // Check recently rejected WFH requests (within 7 days)
            $rejectedWfhs = \App\Models\WfhRequest::with(['user'])
                ->where('status', 'Rejected')
                ->where('tl_status', 'Rejected')
                ->where('updated_at', '>=', now()->subDays(7))
                ->get();

            foreach ($rejectedWfhs as $rw) {
                if ($rw->approved_by && (int)$rw->approved_by !== (int)$user->id) {
                    $hasNotif = \Illuminate\Support\Facades\DB::table('notifications')
                        ->where('notifiable_id', $user->id)
                        ->where('type', \App\Notifications\WfhRequestNotification::class)
                        ->where('data', 'like', '%"wfh_request_id":' . $rw->id . '%')
                        ->exists();

                    if (!$hasNotif) {
                        $appr = \App\Models\User::find($rw->approved_by);
                        $apprName = $appr ? "{$appr->first_name} {$appr->last_name}" : "Approver";
                        $empName = $rw->user ? "{$rw->user->first_name} {$rw->user->last_name}" : "Employee";
                        $reasonPart = !empty($rw->remarks) ? " Reason: {$rw->remarks}" : "";
                        $msg = "Approver {$apprName} rejected {$empName}'s WFH request.{$reasonPart}";
                        $user->notify(new \App\Notifications\WfhRequestNotification('tl_rejected', $rw, $msg));
                    }
                }
            }

            // Check recently rejected Leave requests (within 7 days)
            $rejectedLeaves = \App\Models\LeaveRequest::with(['user', 'leaveType'])
                ->where('status', 'Rejected')
                ->where('tl_status', 'Rejected')
                ->where('updated_at', '>=', now()->subDays(7))
                ->get();

            foreach ($rejectedLeaves as $rl) {
                if ($rl->approved_by && (int)$rl->approved_by !== (int)$user->id) {
                    $hasNotif = \Illuminate\Support\Facades\DB::table('notifications')
                        ->where('notifiable_id', $user->id)
                        ->where('type', \App\Notifications\LeaveRequestNotification::class)
                        ->where('data', 'like', '%"leave_request_id":' . $rl->id . '%')
                        ->exists();

                    if (!$hasNotif) {
                        $appr = \App\Models\User::find($rl->approved_by);
                        $apprName = $appr ? "{$appr->first_name} {$appr->last_name}" : "Approver";
                        $empName = $rl->user ? "{$rl->user->first_name} {$rl->user->last_name}" : "Employee";
                        $typeName = $rl->leaveType?->name ?? "Leave";
                        $reasonPart = !empty($rl->rejection_reason) ? " Reason: {$rl->rejection_reason}" : "";
                        $msg = "Approver {$apprName} rejected {$empName}'s {$typeName} request.{$reasonPart}";
                        $user->notify(new \App\Notifications\LeaveRequestNotification('tl_rejected', $rl, $msg));
                    }
                }
            }
        } catch (\Throwable $e) {}
    }

    /**
     * Mark a specific notification or all notifications as read
     */
    public function markAsRead(Request $request, $id = null): JsonResponse
    {
        $user = Auth::user();
        
        if ($id) {
            $notification = $user->notifications()->find($id);
            if ($notification) {
                $notification->markAsRead();
            }
        } else {
            // Mark all as read if no ID is provided
            $user->unreadNotifications->markAsRead();
        }
        
        return response()->json([
            'status' => 'success',
            'message' => 'Notification(s) marked as read successfully'
        ]);
    }
    
    /**
     * Delete a specific notification
     */
    public function destroy($id): JsonResponse
    {
        $user = Auth::user();
        
        $notification = $user->notifications()->find($id);
        
        if ($notification) {
            $notification->delete();
        }
        
        return response()->json([
            'status' => 'success',
            'message' => 'Notification deleted successfully'
        ]);
    }
}
