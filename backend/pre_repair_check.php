<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\BiometricEvent;
use App\Models\Attendance;
use App\Models\AttendanceBreak;
use App\Models\User;

echo "\n========== PRE-REPAIR STATE ==========\n";

// Employee 272
echo "\n[EMPLOYEE 272]\n";
$emp272 = User::where('employee_code', '272')->first();
if ($emp272) {
    $events272 = BiometricEvent::where('user_id', $emp272->id)
        ->whereDate('local_punch_time', '2026-07-08')
        ->get();

    echo "Total events: " . $events272->count() . "\n";
    echo "Event status breakdown:\n";
    foreach ($events272->groupBy('processing_status') as $status => $evts) {
        echo "  $status: " . $evts->count() . "\n";
    }

    echo "Event error breakdown:\n";
    foreach ($events272->groupBy('error_reason') as $reason => $evts) {
        $displayReason = $reason ?? 'NULL';
        echo "  $displayReason: " . $evts->count() . "\n";
    }

    $att272 = Attendance::where('user_id', $emp272->id)
        ->where('date', '2026-07-08')
        ->where('source', 'biometric')
        ->first();

    if ($att272) {
        echo "Attendance: check_in={$att272->check_in_time}, check_out={$att272->check_out_time}\n";
        echo "Working minutes: {$att272->total_working_minutes}\n";
        $breaks = AttendanceBreak::where('attendance_id', $att272->id)->count();
        echo "Break records: $breaks\n";
    } else {
        echo "Attendance: NO RECORD\n";
    }

    $latestEvent = $events272->sortBy('local_punch_time')->last();
    echo "Latest event: " . ($latestEvent?->local_punch_time ?? 'NONE') . " " . ($latestEvent?->direction ?? '') . "\n";
} else {
    echo "Employee 272 not found!\n";
}

// Employee 231
echo "\n[EMPLOYEE 231]\n";
$emp231 = User::where('employee_code', '231')->first();
if ($emp231) {
    $events231 = BiometricEvent::where('user_id', $emp231->id)
        ->whereDate('local_punch_time', '2026-07-08')
        ->get();

    echo "Total events: " . $events231->count() . "\n";
    echo "Event status breakdown:\n";
    foreach ($events231->groupBy('processing_status') as $status => $evts) {
        echo "  $status: " . $evts->count() . "\n";
    }

    $att231 = Attendance::where('user_id', $emp231->id)
        ->where('date', '2026-07-08')
        ->where('source', 'biometric')
        ->first();

    if ($att231) {
        echo "Attendance: check_in={$att231->check_in_time}, check_out={$att231->check_out_time}\n";
        echo "Working minutes: {$att231->total_working_minutes}\n";
        $breaks = AttendanceBreak::where('attendance_id', $att231->id)->count();
        echo "Break records: $breaks\n";
    } else {
        echo "Attendance: NO RECORD\n";
    }

    $latestEvent = $events231->sortBy('local_punch_time')->last();
    echo "Latest event: " . ($latestEvent?->local_punch_time ?? 'NONE') . " " . ($latestEvent?->direction ?? '') . "\n";
} else {
    echo "Employee 231 not found!\n";
}

echo "\n========== END PRE-REPAIR STATE ==========\n";
