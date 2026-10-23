<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Per email+IP, not IP alone: the whole office shares one IP, so an IP-only limit would lock everyone out.
        // Generous per-user ceiling (normal use with chat/notification polling is well under 30/min).
        RateLimiter::for('api', fn (Request $request) =>
            Limit::perMinute(300)->by($request->user()?->id ?: $request->ip())
        );

        RateLimiter::for('login', fn (Request $request) =>
            Limit::perMinute(10)->by(strtolower((string) $request->input('email')) . '|' . $request->ip())
        );
    }
}
