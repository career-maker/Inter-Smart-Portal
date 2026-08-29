<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Annual leave allocation – runs on Jan 1st at midnight every year (for employees not on monthly accrual)
Schedule::command('leave:annual-allocation')->yearlyOn(1, 1, '00:00');

// Unified dynamic leave policy processor – runs daily at 00:01
Schedule::command('leave:process-policy-cycle')->dailyAt('00:01');

// Process biometric events every five minutes sequentially
Schedule::command('biometric:process')->everyFiveMinutes()->withoutOverlapping();
