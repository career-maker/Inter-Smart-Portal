<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Annual leave allocation – runs on Jan 1st at midnight every year (for employees not on monthly accrual)
Schedule::command('leave:annual-allocation')->yearlyOn(1, 1, '00:00');

// Monthly leave accrual – runs daily at 00:10 to check for probation completion anniversaries
Schedule::command('leave:monthly-accrual')->dailyAt('00:10');

// Year-end leave expiration – runs on Dec 31st to expire unused SL and old carry-forward
Schedule::command('leave:year-end-expiration')->yearlyOn(12, 31, '23:55');

// Process biometric events every five minutes sequentially
Schedule::command('biometric:process')->everyFiveMinutes()->withoutOverlapping();
