<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BirthdayWish;
use App\Models\User;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class BirthdayWishController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'birthday_user_id' => 'required|exists:users,id',
            'message' => 'required|string|min:1|max:500',
        ]);

        $sender = auth()->user();

        try {
            $wish = BirthdayWish::create([
                'birthday_user_id' => $validated['birthday_user_id'],
                'sender_id' => $sender->id,
                'message' => $validated['message'],
            ]);

            // Create notification for the birthday person
            $birthdayPerson = User::find($validated['birthday_user_id']);
            Notification::create([
                'user_id' => $birthdayPerson->id,
                'title' => 'Birthday Wish',
                'message' => "{$sender->first_name} {$sender->last_name} wished you on your birthday!",
                'type' => 'birthday_wish',
                'link' => '/profile',
                'is_read' => false,
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Birthday wish sent!',
                'data' => [
                    'id' => $wish->id,
                    'sender' => [
                        'id' => $sender->id,
                        'first_name' => $sender->first_name,
                        'last_name' => $sender->last_name,
                        'profile_photo_path' => $sender->profile_photo_path,
                    ],
                    'message' => $wish->message,
                    'created_at' => $wish->created_at->toDateTimeString(),
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Birthday wish creation error', ['error' => $e->getMessage()]);
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to send wish'
            ], 500);
        }
    }

    public function getUserWishes($userId): JsonResponse
    {
        try {
            $wishes = BirthdayWish::where('birthday_user_id', $userId)
                ->with(['sender:id,first_name,last_name,profile_photo_path'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(fn($wish) => [
                    'id' => $wish->id,
                    'sender' => [
                        'id' => $wish->sender->id,
                        'name' => "{$wish->sender->first_name} {$wish->sender->last_name}",
                        'profile_photo_path' => $wish->sender->profile_photo_path,
                    ],
                    'message' => $wish->message,
                    'created_at' => $wish->created_at->toDateTimeString(),
                ]);

            return response()->json([
                'status' => 'success',
                'data' => $wishes,
            ]);
        } catch (\Exception $e) {
            \Log::error('Fetch wishes error', ['error' => $e->getMessage()]);
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch wishes'
            ], 500);
        }
    }

    public function todayWishes(): JsonResponse
    {
        try {
            $today = Carbon::today();
            $allUsers = User::where('status', 'Active')->get(['id', 'first_name', 'last_name', 'dob']);

            $todayBirthdayIds = $allUsers
                ->filter(function($user) use ($today) {
                    if (!$user->dob) return false;
                    $dob = Carbon::parse($user->dob);
                    return $dob->month === $today->month && $dob->day === $today->day;
                })
                ->pluck('id')
                ->toArray();

            if (empty($todayBirthdayIds)) {
                return response()->json(['status' => 'success', 'data' => []]);
            }

            $wishes = BirthdayWish::whereIn('birthday_user_id', $todayBirthdayIds)
                ->with(['sender:id,first_name,last_name,profile_photo_path', 'birthdayUser:id,first_name,last_name'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(fn($wish) => [
                    'id' => $wish->id,
                    'birthday_person' => [
                        'id' => $wish->birthdayUser->id,
                        'name' => "{$wish->birthdayUser->first_name} {$wish->birthdayUser->last_name}",
                    ],
                    'sender' => [
                        'id' => $wish->sender->id,
                        'name' => "{$wish->sender->first_name} {$wish->sender->last_name}",
                        'profile_photo_path' => $wish->sender->profile_photo_path,
                    ],
                    'message' => $wish->message,
                    'created_at' => $wish->created_at->toDateTimeString(),
                ]);

            return response()->json([
                'status' => 'success',
                'data' => $wishes,
            ]);
        } catch (\Exception $e) {
            \Log::error('Today wishes fetch error', ['error' => $e->getMessage()]);
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch wishes'
            ], 500);
        }
    }
}
