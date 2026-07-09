<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BirthdayWish;
use App\Models\User;
use App\Notifications\BirthdayWishNotification;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class BirthdayWishController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'birthday_user_id' => 'required|integer|exists:users,id',
                'message' => 'required|string|min:1|max:500',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed: ' . json_encode($e->errors())
            ], 422);
        }

        $sender = auth()->user();

        try {
            $birthdayUserId = (int) $validated['birthday_user_id'];

            \Log::info('Birthday wish attempt', [
                'sender_id' => $sender->id,
                'birthday_user_id' => $birthdayUserId,
                'message_length' => strlen($validated['message']),
            ]);

            // Create the wish
            $wish = BirthdayWish::create([
                'birthday_user_id' => $birthdayUserId,
                'sender_id' => $sender->id,
                'message' => $validated['message'],
            ]);

            // Return success immediately (wish is created)
            $response = response()->json([
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

            // Send notification to birthday person (fire and forget)
            try {
                $birthdayPerson = User::find($birthdayUserId);
                if ($birthdayPerson) {
                    $senderName = "{$sender->first_name} {$sender->last_name}";
                    $birthdayPerson->notify(new BirthdayWishNotification($wish, $senderName));
                }
            } catch (\Exception $notifError) {
                \Log::warning('Notification failed but wish was sent', [
                    'wish_id' => $wish->id,
                    'error' => $notifError->getMessage(),
                ]);
            }

            return $response;
        } catch (\Illuminate\Database\QueryException $e) {
            $errorMsg = $e->getMessage();
            \Log::error('Database error in birthday wish', [
                'error' => $errorMsg,
                'sql' => $e->getSql(),
                'bindings' => $e->getBindings()
            ]);

            if (strpos($errorMsg, 'unique') !== false || strpos($errorMsg, 'UNIQUE') !== false) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'You have already sent a wish to this person today!'
                ], 409);
            }

            if (strpos($errorMsg, 'foreign key') !== false || strpos($errorMsg, 'FOREIGN KEY') !== false) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'User not found. Please try again.'
                ], 422);
            }

            return response()->json([
                'status' => 'error',
                'message' => 'Database error: ' . $errorMsg
            ], 500);
        } catch (\Exception $e) {
            $errorMsg = $e->getMessage();
            $errorClass = get_class($e);
            \Log::error('Birthday wish creation error', [
                'error' => $errorMsg,
                'class' => $errorClass,
                'trace' => $e->getTraceAsString(),
                'user_id' => $sender->id ?? null,
                'birthday_user_id' => $birthdayUserId ?? null,
            ]);

            return response()->json([
                'status' => 'error',
                'message' => $errorMsg ?: 'Failed to send wish'
            ], 500);
        }
    }

    public function getMyWishes(): JsonResponse
    {
        try {
            $userId = auth()->id();
            $wishes = BirthdayWish::where('birthday_user_id', $userId)
                ->with(['sender:id,first_name,last_name,profile_photo_path,designation'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(fn($wish) => [
                    'id' => $wish->id,
                    'sender' => [
                        'id' => $wish->sender->id,
                        'name' => "{$wish->sender->first_name} {$wish->sender->last_name}",
                        'designation' => $wish->sender->designation,
                        'profile_photo_path' => $wish->sender->profile_photo_path,
                    ],
                    'message' => $wish->message,
                    'created_at' => $wish->created_at->toDateTimeString(),
                ]);

            return response()->json([
                'status' => 'success',
                'data' => $wishes,
                'count' => $wishes->count(),
            ]);
        } catch (\Exception $e) {
            \Log::error('Fetch my wishes error', ['error' => $e->getMessage()]);
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch wishes'
            ], 500);
        }
    }

    public function getUserWishes($userId): JsonResponse
    {
        try {
            $wishes = BirthdayWish::where('birthday_user_id', $userId)
                ->with(['sender:id,first_name,last_name,profile_photo_path,designation'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(fn($wish) => [
                    'id' => $wish->id,
                    'sender' => [
                        'id' => $wish->sender->id,
                        'name' => "{$wish->sender->first_name} {$wish->sender->last_name}",
                        'designation' => $wish->sender->designation,
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
