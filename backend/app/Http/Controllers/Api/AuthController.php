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

    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $email = strtolower(trim($request->email));
        $user = User::whereRaw('LOWER(email) = ?', [$email])->first();

        // If user does not exist or is inactive, return standard message to prevent user enumeration
        if (!$user || $user->status !== 'Active') {
            return response()->json([
                'message' => 'If your email is registered with an active account, you will receive a password reset link shortly.'
            ]);
        }

        // Generate 64-character random token
        $rawToken = Str::random(64);

        // Store hashed token in password_reset_tokens table
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token'      => Hash::make($rawToken),
                'created_at' => now(),
            ]
        );

        // Construct frontend reset password URL
        $frontendUrl = rtrim(config('app.frontend_url') ?? env('FRONTEND_URL') ?? 'https://www.workplace.intersmart.in', '/');
        $resetUrl = $frontendUrl . '/reset-password?token=' . $rawToken . '&email=' . urlencode($user->email);

        // Send email via dynamic SMTP configuration
        try {
            EmailService::applySmtpConfig();
            Mail::to($user->email)->send(new \App\Mail\PasswordResetMail($user, $resetUrl));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("Failed to send password reset email to {$user->email}: " . $e->getMessage());
            return response()->json([
                'message' => 'Failed to send recovery email. Please contact administrator or check email settings.'
            ], 500);
        }

        return response()->json([
            'message' => 'A password reset link has been sent to your email address.'
        ]);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'email'                 => 'required|email',
            'token'                 => 'required|string',
            'password'              => 'required|string|min:8|confirmed',
        ]);

        $email = strtolower(trim($request->email));
        $record = DB::table('password_reset_tokens')->whereRaw('LOWER(email) = ?', [$email])->first();

        if (!$record) {
            return response()->json([
                'message' => 'Invalid or expired password reset link. Please request a new one.'
            ], 422);
        }

        // Token expires in 60 minutes
        $createdAt = \Carbon\Carbon::parse($record->created_at);
        if ($createdAt->addMinutes(60)->isPast()) {
            DB::table('password_reset_tokens')->whereRaw('LOWER(email) = ?', [$email])->delete();
            return response()->json([
                'message' => 'This password reset link has expired. Please request a new one.'
            ], 422);
        }

        // Verify token match
        if (!Hash::check($request->token, $record->token)) {
            return response()->json([
                'message' => 'Invalid password reset token.'
            ], 422);
        }

        // Update user's password
        $user = User::whereRaw('LOWER(email) = ?', [$email])->first();
        if (!$user) {
            return response()->json([
                'message' => 'User account not found.'
            ], 404);
        }

        $user->password = Hash::make($request->password);
        $user->save();

        // Delete used token
        DB::table('password_reset_tokens')->whereRaw('LOWER(email) = ?', [$email])->delete();

        return response()->json([
            'message' => 'Your password has been reset successfully. You can now log in with your new password.'
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
