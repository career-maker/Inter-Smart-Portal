<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\BiometricEvent;
use App\Models\Attendance;
use App\Models\AttendanceBreak;
use App\Models\User;

echo "\n========== POST-REPAIR VERIFICATION ==========\n";

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
        ->get();

    if ($att272->count() > 0) {
        echo "Attendance records: " . $att272->count() . "\n";
        foreach ($att272 as $idx => $att) {
            echo "  Record " . ($idx + 1) . ": check_in={$att->check_in_time}, check_out={$att->check_out_time}, work={$att->total_working_minutes}min\n";
        }

        $firstAtt = $att272->first();
        $breaks = AttendanceBreak::where('attendance_id', $firstAtt->id)->get();
        echo "Break records for first attendance: " . $breaks->count() . "\n";
        foreach ($breaks as $brk) {
            echo "  Break: {$brk->break_start} → {$brk->break_end} ({$brk->total_break_minutes}min)\n";
        }

        if ($att272->count() === 1 && $firstAtt->check_in_time === '2026-07-08 09:45:38' &&
            $firstAtt->check_out_time === '2026-07-08 14:03:26' && $firstAtt->total_working_minutes == 251) {
            echo "✓ VERIFIED: Employee 272 has correct canonical values\n";
        } else {
            echo "✗ ISSUE: Employee 272 values don't match expected\n";
        }
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

    $att231All = Attendance::where('user_id', $emp231->id)
        ->where('date', '2026-07-08')
        ->where('source', 'biometric')
        ->get();

    if ($att231All->count() > 0) {
        echo "Attendance records: " . $att231All->count() . "\n";
        foreach ($att231All as $idx => $att) {
            $co = $att->check_out_time ?? 'NULL';
            echo "  Record " . ($idx + 1) . ": check_in={$att->check_in_time}, check_out=$co, work={$att->total_working_minutes}min\n";
        }

        $firstAtt = $att231All->first();
        if ($att231All->count() === 1 && $firstAtt->check_out_time === null) {
            echo "✓ VERIFIED: Employee 231 checkout is NULL (currently working)\n";
        } else {
            echo "✗ ISSUE: Employee 231 doesn't have single record with NULL checkout\n";
        }

        $breaks = AttendanceBreak::where('attendance_id', $firstAtt->id)->get();
        echo "Break records: " . $breaks->count() . "\n";
    } else {
        echo "Attendance: NO RECORD\n";
    }

    $latestEvent = $events231->sortBy('local_punch_time')->last();
    echo "Latest event: " . ($latestEvent?->local_punch_time ?? 'NONE') . " " . ($latestEvent?->direction ?? '') . "\n";
    if ($latestEvent && $latestEvent->direction === 'in') {
        echo "✓ Latest event is IN (employee working)\n";
    }
} else {
    echo "Employee 231 not found!\n";
}

echo "\n========== END POST-REPAIR VERIFICATION ==========\n";
