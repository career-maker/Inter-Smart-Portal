<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\BiometricEvent;
use App\Models\Attendance;
use App\Models\AttendanceBreak;
use App\Models\User;

echo "\n========== EMPLOYEE 272 PRODUCTION STATE ==========\n";

$emp272 = User::where('employee_code', '272')->first();
if (!$emp272) {
    echo "ERROR: Employee 272 not found!\n";
    exit(1);
}

echo "\n[BIOMETRIC EVENTS]\n";
$events272 = BiometricEvent::where('user_id', $emp272->id)
    ->whereDate('local_punch_time', '2026-07-08')
    ->orderBy('local_punch_time', 'asc')
    ->get();

echo "Total events: " . $events272->count() . "\n";
echo "Expected: 8 events\n\n";

foreach ($events272 as $idx => $evt) {
    $processing = $evt->processing_status ?? 'NULL';
    $reason = $evt->error_reason ?? 'NULL';
    echo "Event " . ($idx + 1) . ":\n";
    echo "  ID: {$evt->id}\n";
    echo "  Source ID: {$evt->source_event_id}\n";
    echo "  Time: {$evt->local_punch_time}\n";
    echo "  Direction: {$evt->direction}\n";
    echo "  Processing Status: $processing\n";
    echo "  Error Reason: $reason\n";
}

echo "\n[ATTENDANCE RECORD]\n";
$att272 = Attendance::where('user_id', $emp272->id)
    ->where('date', '2026-07-08')
    ->where('source', 'biometric')
    ->first();

if ($att272) {
    echo "Found: 1 record\n";
    echo "Check-in: {$att272->check_in_time}\n";
    echo "Check-out: {$att272->check_out_time}\n";
    echo "Working minutes: {$att272->total_working_minutes}\n";
    echo "Status: {$att272->status}\n";

    $expected_checkin = '2026-07-08 09:45:38';
    $expected_checkout = '2026-07-08 14:03:26';
    $expected_minutes = 251;

    echo "\nExpected vs Actual:\n";
    echo "  Check-in: " . ($att272->check_in_time === $expected_checkin ? "✓" : "✗") . " {$att272->check_in_time} vs $expected_checkin\n";
    echo "  Check-out: " . ($att272->check_out_time === $expected_checkout ? "✓" : "✗") . " {$att272->check_out_time} vs $expected_checkout\n";
    echo "  Minutes: " . ($att272->total_working_minutes == $expected_minutes ? "✓" : "✗") . " {$att272->total_working_minutes} vs $expected_minutes\n";
} else {
    echo "No attendance record found\n";
}

echo "\n[ATTENDANCE BREAKS]\n";
if ($att272) {
    $breaks = AttendanceBreak::where('attendance_id', $att272->id)->get();
    echo "Total breaks: " . $breaks->count() . "\n";
    echo "Expected: 1 break (12:11:12 → 12:16:55, 5 minutes)\n\n";

    foreach ($breaks as $idx => $brk) {
        echo "Break " . ($idx + 1) . ":\n";
        echo "  Start: {$brk->break_start}\n";
        echo "  End: {$brk->break_end}\n";
        echo "  Minutes: {$brk->total_break_minutes}\n";
    }
} else {
    echo "No attendance record, skipping breaks\n";
}

echo "\n[SUMMARY]\n";

if ($events272->count() === 8) {
    echo "✓ All 8 expected events present\n";
} else {
    echo "✗ Event count mismatch: {$events272->count()} vs 8\n";
}

$allProcessed = $events272->filter(function($e) {
    return $e->processing_status === 'processed' || $e->processing_status === 'ignored';
})->count() === $events272->count();

if ($allProcessed) {
    echo "✓ All events have final status (processed or ignored)\n";
} else {
    echo "✗ Some events still have error/pending status\n";
}

if ($att272 && $att272->check_in_time === '2026-07-08 09:45:38' &&
    $att272->check_out_time === '2026-07-08 14:03:26' &&
    $att272->total_working_minutes == 251) {
    echo "✓ Attendance record has correct canonical values\n";
} else {
    echo "✗ Attendance record doesn't match expected values\n";
}

echo "\n========== END EMPLOYEE 272 CHECK ==========\n";
