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
        $configuredHash = Config::get('services.biometric.agent_secret_hash');

        // Fail closed if hash is missing, null, or empty
        if (empty($configuredHash) || !is_string($configuredHash)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $token = $request->bearerToken();

        if (empty($token)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Constant-safe hash verification
        if (!Hash::check($token, $configuredHash)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        return $next($request);
    }
}
