<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Annual leave allocation – runs on Jan 1st at midnight every year (for employees not on monthly accrual)
Schedule::command('leave:annual-allocation')->yearlyOn(1, 1, '00:00');

// Unified dynamic leave policy processor – runs every thirty minutes (fully idempotent by cycle_key)
Schedule::command('leave:process-policy-cycle')->everyThirtyMinutes()->withoutOverlapping();

// Process biometric events every five minutes sequentially
Schedule::command('biometric:process')->everyFiveMinutes()->withoutOverlapping();

// Daily data retention cleanup – chat and community posts based on admin retention policy
Schedule::command('portal:cleanup-retention')->dailyAt('01:00')->withoutOverlapping();
Schedule::command('sanctum:prune-expired --hours=24')->dailyAt('01:30')->withoutOverlapping();

// The API already rejects tokens older than 90 days; delete them weekly so the table does not keep them (audit M-02)
Schedule::call(fn () => \Illuminate\Support\Facades\DB::table('personal_access_tokens')->where('created_at', '<', now()->subDays(90))->delete())
    ->weeklyOn(0, '02:00')->name('tokens:prune-old');

// Remind Sales once when an AMC is within 30 days of its renewal date (does nothing while the sales module is off)
Schedule::command('sales:amc-reminders')->dailyAt('08:00')->withoutOverlapping();
