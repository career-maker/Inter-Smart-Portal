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
            if (method_exists($user, 'currentAccessToken') && $user->currentAccessToken()) {
                $user->currentAccessToken()->delete();
            }

            return response()->json([
                'message' => 'Your account is inactive or disabled. You have been logged out.'
            ], 401);
        }

        return $next($request);
    }
}
