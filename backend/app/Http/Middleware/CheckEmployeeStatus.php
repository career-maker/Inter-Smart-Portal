<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CheckEmployeeStatus
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        // For API requests, check the sanctum guard
        $user = Auth::guard('sanctum')->user();
        
        if ($user && $user->status !== 'Active') {
            // Only a real personal access token can be revoked; a transient token (used by actingAs and some guards) has no delete() and used to cause a 500
            $token = method_exists($user, 'currentAccessToken') ? $user->currentAccessToken() : null;
            if ($token instanceof \Laravel\Sanctum\PersonalAccessToken) {
                $token->delete();
            }

            return response()->json([
                'message' => 'Your account is inactive or disabled. You have been logged out.'
            ], 401);
        }

        return $next($request);
    }
}
