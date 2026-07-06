<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Annual leave allocation – runs on Jan 1st at midnight every year
Schedule::command('leave:annual-allocation')->yearlyOn(1, 1, '00:00');

// Daily check: activate prorated leaves for employees who just completed probation
Schedule::command('leave:activate-post-probation')->dailyAt('00:05');

// Process biometric events every five minutes sequentially
Schedule::command('biometric:process')->everyFiveMinutes()->withoutOverlapping();
