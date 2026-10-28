<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Safe response headers for every API answer. Deliberately NOT sent: X-Frame-Options / frame-ancestors, because the Vercel front end may show
 * API-served files (for example PDFs) in a frame from another origin.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        if ($request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000'); // no includeSubDomains: other sub-domains may not be HTTPS-only
        }

        return $response;
    }
}
