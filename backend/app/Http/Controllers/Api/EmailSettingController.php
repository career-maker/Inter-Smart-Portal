<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmailSetting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;

class EmailSettingController extends Controller
{
    /**
     * Get all email settings (SMTP, routing, employee overrides).
     */
    public function index(Request $request): JsonResponse
    {
        $admin = $request->user();
        if (!$admin->hasRole('Super Admin')) {
            return response()->json(['message' => 'Forbidden: Super Admin access required.'], 403);
        }

        $smtp = EmailSetting::getByKey('smtp_config', EmailSetting::defaultSmtp());
        $routing = EmailSetting::getByKey('global_routing', EmailSetting::defaultRouting());
        $overrides = EmailSetting::getByKey('employee_overrides', []);

        // Attach employee names to overrides for display
        $userIds = collect($overrides)->pluck('user_id')->filter()->unique();
        $users = User::whereIn('id', $userIds)->get(['id', 'first_name', 'last_name', 'email', 'employee_code', 'team_id']);
        $usersMap = $users->keyBy('id');

        $hydratedOverrides = collect($overrides)->map(function ($item) use ($usersMap) {
            $u = $usersMap->get($item['user_id'] ?? 0);
            return array_merge($item, [
                'user_name' => $u ? "{$u->first_name} {$u->last_name}" : 'Unknown Employee',
                'employee_code' => $u->employee_code ?? '',
                'user_email' => $u->email ?? '',
            ]);
        })->values();

        return response()->json([
            'status' => 'success',
            'data' => [
                'smtp' => $smtp,
                'routing' => $routing,
                'employee_overrides' => $hydratedOverrides,
                'default_routing' => EmailSetting::defaultRouting(),
            ],
        ]);
    }

    /**
     * Save SMTP settings.
     */
    public function updateSmtp(Request $request): JsonResponse
    {
        $admin = $request->user();
        if (!$admin->hasRole('Super Admin')) {
            return response()->json(['message' => 'Forbidden: Super Admin access required.'], 403);
        }

        $validated = $request->validate([
            'host' => 'required|string|max:255',
            'port' => 'required|integer|min:1|max:65535',
            'encryption' => 'nullable|string|in:tls,ssl,none',
            'username' => 'required|email|max:255',
            'password' => 'nullable|string|max:255',
            'from_address' => 'required|email|max:255',
            'from_name' => 'required|string|max:255',
        ]);

        $current = EmailSetting::getByKey('smtp_config', EmailSetting::defaultSmtp());

        // If password is not provided, keep previous password
        if (empty($validated['password']) && !empty($current['password'])) {
            $validated['password'] = $current['password'];
        }

        EmailSetting::setByKey('smtp_config', $validated);

        return response()->json([
            'status' => 'success',
            'message' => 'SMTP server and sender configuration saved successfully.',
            'data' => $validated,
        ]);
    }

    /**
     * Save global recipient & CC routing rules.
     */
    public function updateRouting(Request $request): JsonResponse
    {
        $admin = $request->user();
        if (!$admin->hasRole('Super Admin')) {
            return response()->json(['message' => 'Forbidden: Super Admin access required.'], 403);
        }

        $validated = $request->validate([
            'routing' => 'required|array',
        ]);

        EmailSetting::setByKey('global_routing', $validated['routing']);

        return response()->json([
            'status' => 'success',
            'message' => 'Email notification and CC routing rules saved successfully.',
            'data' => $validated['routing'],
        ]);
    }

    /**
     * Save employee-specific email overrides.
     */
    public function updateEmployeeOverrides(Request $request): JsonResponse
    {
        $admin = $request->user();
        if (!$admin->hasRole('Super Admin')) {
            return response()->json(['message' => 'Forbidden: Super Admin access required.'], 403);
        }

        $validated = $request->validate([
            'overrides' => 'present|array',
            'overrides.*.user_id' => 'required|integer|exists:users,id',
            'overrides.*.action' => 'required|string|max:100',
            'overrides.*.custom_to' => 'nullable|string|max:255',
            'overrides.*.custom_cc' => 'nullable|array',
            'overrides.*.custom_cc.*' => 'email',
            'overrides.*.enabled' => 'boolean',
            'overrides.*.notes' => 'nullable|string|max:500',
        ]);

        EmailSetting::setByKey('employee_overrides', $validated['overrides']);

        return response()->json([
            'status' => 'success',
            'message' => 'Employee email overrides saved successfully.',
            'data' => $validated['overrides'],
        ]);
    }

    /**
     * Send a test email to verify SMTP credentials.
     */
    public function sendTestEmail(Request $request): JsonResponse
    {
        $admin = $request->user();
        if (!$admin->hasRole('Super Admin')) {
            return response()->json(['message' => 'Forbidden: Super Admin access required.'], 403);
        }

        $validated = $request->validate([
            'test_email' => 'required|email',
            'host' => 'nullable|string',
            'port' => 'nullable|integer',
            'encryption' => 'nullable|string',
            'username' => 'nullable|email',
            'password' => 'nullable|string',
            'from_address' => 'nullable|email',
            'from_name' => 'nullable|string',
        ]);

        $destination = $validated['test_email'];

        // Use submitted credentials or fallback to saved config
        $smtp = EmailSetting::getByKey('smtp_config', EmailSetting::defaultSmtp());
        $host = $validated['host'] ?? $smtp['host'] ?? 'smtp.gmail.com';
        $port = $validated['port'] ?? $smtp['port'] ?? 587;
        $encryption = $validated['encryption'] ?? $smtp['encryption'] ?? 'tls';
        $username = $validated['username'] ?? $smtp['username'] ?? 'career@intersmart.in';
        $password = !empty($validated['password']) ? $validated['password'] : ($smtp['password'] ?? '');
        $fromAddress = $validated['from_address'] ?? $smtp['from_address'] ?? $username;
        $fromName = $validated['from_name'] ?? $smtp['from_name'] ?? 'Inter Smart Portal';

        if (empty($password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'SMTP / Google App Password is not configured. Please enter the password to test.',
            ], 422);
        }

        try {
            // Dynamically configure mail transport at runtime
            Config::set('mail.mailers.smtp', [
                'transport' => 'smtp',
                'host' => $host,
                'port' => (int)$port,
                'encryption' => $encryption === 'none' ? null : $encryption,
                'username' => $username,
                'password' => $password,
                'timeout' => 15,
            ]);
            Config::set('mail.from', [
                'address' => $fromAddress,
                'name' => $fromName,
            ]);

            Mail::raw(
                "Hello!\n\nThis is a test email sent from the Inter Smart Portal Email Management module.\n\nSMTP Host: {$host}\nPort: {$port}\nEncryption: {$encryption}\nSender: {$fromAddress}\nTimestamp: " . now('Asia/Kolkata')->toDateTimeString() . " IST\n\nIf you received this, your SMTP & Google App Password settings are fully working!",
                function ($message) use ($destination, $fromAddress, $fromName) {
                    $message->to($destination)
                            ->from($fromAddress, $fromName)
                            ->subject("✅ Inter Smart Portal - SMTP Test Email Successful (" . now('Asia/Kolkata')->format('d M Y H:i') . ")");
                }
            );

            return response()->json([
                'status' => 'success',
                'message' => "Test email successfully sent to {$destination}!",
            ]);
        } catch (\Throwable $e) {
            Log::error("SMTP Test Email Error: " . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to send test email: ' . $e->getMessage(),
            ], 500);
        }
    }
}
