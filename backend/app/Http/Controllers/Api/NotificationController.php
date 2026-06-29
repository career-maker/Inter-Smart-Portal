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
