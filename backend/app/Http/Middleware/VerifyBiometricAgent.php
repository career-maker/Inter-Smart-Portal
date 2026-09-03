<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

class VerifyBiometricAgent
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (empty($token)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Check for bcrypt hash first (production)
        $configuredHash = trim((string) Config::get('services.biometric.agent_secret_hash'));
        if (!empty($configuredHash) && is_string($configuredHash)) {
            // Constant-safe hash verification or direct match
            if (hash_equals($configuredHash, $token) || password_verify($token, $configuredHash)) {
                return $next($request);
            }
        }

        // Check for plaintext secret (development)
        $plainSecret = trim((string) Config::get('services.biometric.agent_secret'));
        if (!empty($plainSecret) && is_string($plainSecret)) {
            if (hash_equals($plainSecret, $token)) {
                return $next($request);
            }
        }

        // No matching secret found
        return response()->json(['error' => 'Unauthorized'], 401);
    }
}
