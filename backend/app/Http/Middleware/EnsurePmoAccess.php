<?php

namespace App\Http\Middleware;

use App\Support\Access;
use Closure;
use Illuminate\Http\Request;

/** Project Office: Super Admin or members of a PMO team. */
class EnsurePmoAccess
{
    public function handle(Request $request, Closure $next)
    {
        if (! Access::pmo($request->user())) {
            return response()->json(['message' => 'You do not have access to the Project Office.'], 403);
        }

        return $next($request);
    }
}
