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
