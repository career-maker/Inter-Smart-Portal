<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use App\Models\User;
use App\Services\Email\EmailService;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        $user = User::whereRaw('LOWER(email) = ?', [strtolower($request->email)])->first();

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
        $user->load('roles', 'permissions', 'team');
        
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
                'employee_code' => $user->employee_code,
                'team' => $user->team->name ?? 'Unassigned',
                'team_id' => $user->team_id,
                'team_name' => $user->team->name ?? null,
                'phone' => $user->phone,
                'emergency_contact' => $user->emergency_contact,
                'address' => $user->address,
                'city' => $user->city,
                'state' => $user->state,
                'zip' => $user->zip,
                'role' => $user->primaryRoleName(),
                'permissions' => $user->getAllPermissions()->pluck('name'),
                'profile_photo_path' => $user->profilePhotoUrl(),
            ]
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $user->load('roles', 'permissions', 'team');

        return response()->json([
            'user' => [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'designation' => $user->designation,
                'employee_code' => $user->employee_code,
                'team' => $user->team->name ?? 'Unassigned',
                'team_id' => $user->team_id,
                'team_name' => $user->team->name ?? null,
                'phone' => $user->phone,
                'emergency_contact' => $user->emergency_contact,
                'address' => $user->address,
                'city' => $user->city,
                'state' => $user->state,
                'zip' => $user->zip,
                'role' => $user->primaryRoleName(),
                'permissions' => $user->getAllPermissions()->pluck('name'),
                'profile_photo_path' => $user->profilePhotoUrl(),
            ]
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }
}
