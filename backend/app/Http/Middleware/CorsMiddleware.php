<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CorsMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $allowedOrigins = config('cors.allowed_origins', []);
        $origin = $request->header('Origin');

        // Check if origin is allowed
        $isAllowed = in_array($origin, $allowedOrigins) ||
                     in_array('*', $allowedOrigins);

        $response = $next($request);

        if ($isAllowed) {
            $response->header('Access-Control-Allow-Origin', $origin ?: '*');
            $response->header('Access-Control-Allow-Credentials', 'true');
            $response->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
            $response->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
            $response->header('Access-Control-Max-Age', '86400');
        }

        return $response;
    }
}
