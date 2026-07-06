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
        $configuredHash = trim((string) Config::get('services.biometric.agent_secret_hash'));

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
            $rawHash = (string) Config::get('services.biometric.agent_secret_hash');
            $isValidPrefix = str_starts_with($configuredHash, '$2y$') || str_starts_with($configuredHash, '$2a$') || str_starts_with($configuredHash, '$2b$');
            
            $checkResult = Hash::check($token, $configuredHash);

            $diag = json_encode([
                'token_present' => true,
                'token_length' => strlen((string) $token),
                'token_sha256_prefix' => substr(hash('sha256', (string) $token), 0, 12),
                'configured_hash_raw_length' => strlen($rawHash),
                'configured_hash_trimmed_length' => strlen($configuredHash),
                'configured_hash_sha256_prefix' => substr(hash('sha256', $configuredHash), 0, 12),
                'bcrypt_prefix_valid' => $isValidPrefix,
                'bcrypt_check_result' => $checkResult
            ]);
            error_log('BIOMETRIC_AUTH_DIAGNOSTIC: ' . $diag);

            if (!$checkResult) {
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
