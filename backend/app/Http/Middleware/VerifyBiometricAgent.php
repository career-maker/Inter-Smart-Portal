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
        $rawHash = (string) Config::get('services.biometric.agent_secret_hash');
        $configuredHash = trim($rawHash);
        
        $diag = json_encode([
            'raw_length' => strlen($rawHash),
            'trimmed_length' => strlen($configuredHash),
            'first_4_chars' => substr($configuredHash, 0, 4),
            'last_1_char' => substr($configuredHash, -1),
            'starts_with_dollar_2y_dollar' => str_starts_with($configuredHash, '$2y$'),
            'starts_with_dollar_2a_dollar' => str_starts_with($configuredHash, '$2a$'),
            'starts_with_dollar_2b_dollar' => str_starts_with($configuredHash, '$2b$')
        ]);
        error_log('BIOMETRIC_HASH_RUNTIME_DIAGNOSTIC: ' . $diag);

        // Fail closed if hash is missing, null, or empty
        if (empty($configuredHash) || !is_string($configuredHash)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $token = $request->bearerToken();

        if (empty($token)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Constant-safe hash verification
        try {
            if (!Hash::check($token, $configuredHash)) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }
        } catch (\Throwable $e) {
            $msg = preg_replace('/[^a-zA-Z0-9\s:_-]/', '', $e->getMessage());
            $payload = json_encode([
                'class' => get_class($e),
                'message' => substr($msg, 0, 150)
            ]);
            error_log('BIOMETRIC_AUTH_HASH_EXCEPTION: ' . $payload);
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        return $next($request);
    }
}
