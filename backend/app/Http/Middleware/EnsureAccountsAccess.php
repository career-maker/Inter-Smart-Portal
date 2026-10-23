<?php

namespace App\Http\Middleware;

use App\Support\Access;
use Closure;
use Illuminate\Http\Request;

/** Accounts module: Super Admin, members of the Accounts team, or users with the Accounts role. */
class EnsureAccountsAccess
{
    public function handle(Request $request, Closure $next)
    {
        if (! Access::accounts($request->user())) {
            return response()->json(['message' => 'You do not have access to Accounts.'], 403);
        }

        return $next($request);
    }
}
