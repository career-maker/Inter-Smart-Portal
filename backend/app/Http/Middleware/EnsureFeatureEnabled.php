<?php

namespace App\Http\Middleware;

use App\Support\Feature;
use Closure;
use Illuminate\Http\Request;

/** Usage on a route group: ->middleware('feature:accounts') */
class EnsureFeatureEnabled
{
    public function handle(Request $request, Closure $next, string $module)
    {
        if (! Feature::enabled($module)) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        return $next($request);
    }
}
