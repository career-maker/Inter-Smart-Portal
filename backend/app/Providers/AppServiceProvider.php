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

        // Own changes show on the dashboard immediately (see DashboardController::index).
        foreach ([\App\Models\LeaveRequest::class, \App\Models\WfhRequest::class, \App\Models\Attendance::class] as $model) {
            $forget = fn ($m) => $m->user_id && \Illuminate\Support\Facades\Cache::forget(\App\Http\Controllers\Api\DashboardController::cacheKey((int) $m->user_id));
            $model::saved($forget);
            $model::deleted($forget);
        }

        // Per minute as before, plus an hourly cap so slow password guessing is also stopped.
        RateLimiter::for('login', function (Request $request) {
            $key = strtolower((string) $request->input('email')) . '|' . $request->ip();
            return [Limit::perMinute(10)->by($key), Limit::perHour(40)->by($key . '|h')];
        });
    }
}
