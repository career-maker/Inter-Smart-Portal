<?php

namespace App\Http\Middleware;

use App\Support\Access;
use Closure;
use Illuminate\Http\Request;

/** Sales module: Super Admin or members of the Sales team. */
class EnsureSalesAccess
{
    public function handle(Request $request, Closure $next)
    {
        if (! Access::sales($request->user())) {
            return response()->json(['message' => 'You do not have access to Sales.'], 403);
        }

        return $next($request);
    }
}
