<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\BiometricEvent;
use App\Models\Attendance;
use App\Models\AttendanceBreak;
use Illuminate\Support\Facades\DB;

$eventIds = [3,4,17,18,19,35,42,44,95,96,97,98,99,117,153,179,180,227,228,232];

echo "=== 2. Attendance Verification ===\n";
foreach (['2026-06-29', '2026-07-07'] as $d) {
    $atts = Attendance::where('user_id', 2)->where('date', $d)->get();
    echo "Date {$d}: Found " . $atts->count() . " attendance row(s)\n";
    foreach ($atts as $att) {
        echo "Attendance ID: {$att->id}, check_in_time: " . ($att->check_in_time ?? 'NULL') . ", check_out_time: " . ($att->check_out_time ?? 'NULL') . ", status: {$att->status}, total_working_minutes: " . ($att->total_working_minutes ?? 'NULL') . "\n";
    }
}

echo "\n=== 3. Break Verification ===\n";
$attJuly7 = Attendance::where('user_id', 2)->where('date', '2026-07-07')->first();
if ($attJuly7) {
    $breaks = AttendanceBreak::where('attendance_id', $attJuly7->id)->orderBy('break_start', 'asc')->get();
    echo "Total breaks found: " . $breaks->count() . "\n";
    foreach ($breaks as $idx => $b) {
        echo "Break " . ($idx+1) . ": start: {$b->break_start}, end: {$b->break_end}, duration: {$b->total_break_minutes} mins\n";
    }
} else {
    echo "No attendance record found on July 7 to check breaks.\n";
}

echo "\n=== 4. Event Status Verification ===\n";
$events = BiometricEvent::whereIn('id', $eventIds)->orderBy('id', 'asc')->get();
foreach ($events as $evt) {
    echo "ID: {$evt->id} -> Status: {$evt->processing_status}, Reason: " . ($evt->error_reason ?? 'NULL') . "\n";
}

echo "\n=== 7. Cache Locks ===\n";
$locks = DB::table('cache_locks')->get();
echo "Cache locks count: " . $locks->count() . "\n";
foreach ($locks as $l) {
    echo "Lock Key: {$l->key}\n";
}
