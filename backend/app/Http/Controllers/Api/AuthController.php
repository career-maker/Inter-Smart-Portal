<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Invalid credentials'
            ], 401);
        }

        if ($user->status !== 'Active') {
            return response()->json([
                'message' => 'Account is inactive or disabled'
            ], 403);
        }

        // Return user with roles and permissions
        $user->load('roles', 'permissions');
        
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Logged in successfully',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'designation' => $user->designation,
                'role' => $user->roles->pluck('name')->first(),
                'permissions' => $user->getAllPermissions()->pluck('name'),
                'profile_photo_path' => $user->profilePhotoUrl(),
            ]
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $user->load('roles', 'permissions');

        return response()->json([
            'user' => [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'designation' => $user->designation,
                'role' => $user->roles->pluck('name')->first(),
                'permissions' => $user->getAllPermissions()->pluck('name'),
                'profile_photo_path' => $user->profilePhotoUrl(),
            ]
        ]);
    }

    public function forgotPassword(Request $request)
    {
        // TODO: Implement forgot password email generation
        return response()->json(['message' => 'Password reset link sent (stub)']);
    }

    public function resetPassword(Request $request)
    {
        // TODO: Implement actual password reset logic
        return response()->json(['message' => 'Password reset successfully (stub)']);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }
}
