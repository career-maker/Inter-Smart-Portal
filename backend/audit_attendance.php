#!/usr/bin/env php
<?php
/**
 * Production Attendance Audit Script
 * READ-ONLY - Does not modify data
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Attendance;
use App\Models\AttendanceBreak;
use App\Models\BiometricEvent;
use App\Models\User;
use Illuminate\Support\Carbon;

echo "\n═══════════════════════════════════════════════════════════════════════════════\n";
echo "PRODUCTION ATTENDANCE AUDIT\n";
echo "═══════════════════════════════════════════════════════════════════════════════\n\n";

// Phase 1: Count overall attendance
$totalAttendance = Attendance::count();
$bioAttendance = Attendance::where('source', 'biometric')->count();
$manualAttendance = Attendance::where('source', 'manual')->count();
$unknownSourceAttendance = Attendance::whereNull('source')->orWhere('source', '')->count();

echo "ATTENDANCE OVERVIEW:\n";
echo "  Total attendance rows: $totalAttendance\n";
echo "  Biometric source: $bioAttendance\n";
echo "  Manual source: $manualAttendance\n";
echo "  Unknown/null source: $unknownSourceAttendance\n\n";

// Phase 2: List all manual attendance with details
echo "═══════════════════════════════════════════════════════════════════════════════\n";
echo "MANUAL ATTENDANCE RECORDS (Potential Legacy/Dummy Data)\n";
echo "═══════════════════════════════════════════════════════════════════════════════\n\n";

$manualRecords = Attendance::where('source', 'manual')
    ->with('user', 'breaks')
    ->orderBy('date', 'desc')
    ->get();

foreach ($manualRecords as $att) {
    $employee = $att->user;
    $breakCount = $att->breaks()->count();
    $breakSources = $att->breaks()->pluck('source')->unique()->toArray();

    // Check if biometric events exist for same employee/date
    $bioEventsExist = BiometricEvent::where('user_id', $att->user_id)
        ->whereDate('local_punch_time', $att->date)
        ->exists();

    echo "[ID: {$att->id}] {$att->date}\n";
    echo "  User: {$employee->first_name} {$employee->last_name} (ID: {$employee->id}, Code: {$employee->employee_code})\n";
    echo "  Check-in: {$att->check_in_time} | Check-out: {$att->check_out_time}\n";
    echo "  Status: {$att->status} | Working minutes: {$att->total_working_minutes}\n";
    echo "  Breaks: $breakCount | Break sources: " . implode(',', $breakSources) . "\n";
    echo "  Biometric events exist for same date: " . ($bioEventsExist ? "YES (POTENTIAL CONFLICT)" : "NO") . "\n";
    echo "  Created: {$att->created_at} | Updated: {$att->updated_at}\n";

    // Check if this is likely dummy data
    $isDummy = false;
    $reason = "";

    if ($att->total_working_minutes === 0 || $att->total_working_minutes === null) {
        $isDummy = true;
        $reason .= "No work minutes recorded. ";
    }
    if ($att->check_in_time && $att->check_out_time) {
        $checkIn = Carbon::parse($att->check_in_time);
        $checkOut = Carbon::parse($att->check_out_time);
        $duration = $checkIn->diffInMinutes($checkOut);
        if ($duration < 60) {
            $isDummy = true;
            $reason .= "Duration only $duration minutes (suspicious). ";
        }
    } else if (!$att->check_in_time && !$att->check_out_time) {
        $isDummy = true;
        $reason .= "No check-in or check-out times. ";
    }

    // Check created date - if very old and before biometric integration
    if ($att->created_at && $att->created_at < Carbon::parse('2026-07-01')) {
        $isDummy = true;
        $reason .= "Created before biometric integration (before 2026-07-01). ";
    }

    if ($isDummy) {
        echo "  ⚠️  LIKELY DUMMY/LEGACY: $reason\n";
    }

    echo "\n";
}

// Phase 3: Check for conflicts
echo "═══════════════════════════════════════════════════════════════════════════════\n";
echo "CONFLICT ANALYSIS\n";
echo "═══════════════════════════════════════════════════════════════════════════════\n\n";

$conflicts = [];
foreach ($manualRecords as $att) {
    $bioEventsCount = BiometricEvent::where('user_id', $att->user_id)
        ->whereDate('local_punch_time', $att->date)
        ->count();

    if ($bioEventsCount > 0) {
        $conflicts[] = [
            'attendance_id' => $att->id,
            'user_id' => $att->user_id,
            'employee_code' => $att->user->employee_code,
            'employee_name' => $att->user->first_name . ' ' . $att->user->last_name,
            'date' => $att->date,
            'bio_event_count' => $bioEventsCount
        ];
    }
}

echo "Dates with BOTH manual attendance AND biometric events:\n";
if (count($conflicts) === 0) {
    echo "  None - No conflicts detected\n";
} else {
    foreach ($conflicts as $conflict) {
        echo "  [Attendance ID: {$conflict['attendance_id']}] {$conflict['employee_name']} ({$conflict['employee_code']}) on {$conflict['date']}\n";
        echo "    Manual attendance + {$conflict['bio_event_count']} biometric events\n";
    }
}

echo "\n";

// Phase 4: Check specific users
echo "═══════════════════════════════════════════════════════════════════════════════\n";
echo "SPECIFIC USER AUDIT\n";
echo "═══════════════════════════════════════════════════════════════════════════════\n\n";

// User 2 / Employee 231
$user2Attendance = Attendance::where('user_id', 2)->count();
$user2Manual = Attendance::where('user_id', 2)->where('source', 'manual')->count();
$user2Bio = Attendance::where('user_id', 2)->where('source', 'biometric')->count();

echo "User ID 2 (Employee 231):\n";
echo "  Total attendance: $user2Attendance | Manual: $user2Manual | Biometric: $user2Bio\n";

// User 10 / Aswathi
$user10 = User::find(10);
$user10Name = $user10 ? "{$user10->first_name} {$user10->last_name}" : "Unknown";
$user10Attendance = Attendance::where('user_id', 10)->count();
$user10Manual = Attendance::where('user_id', 10)->where('source', 'manual')->count();
$user10Bio = Attendance::where('user_id', 10)->where('source', 'biometric')->count();

echo "User ID 10 ($user10Name):\n";
echo "  Total attendance: $user10Attendance | Manual: $user10Manual | Biometric: $user10Bio\n";

echo "\n";

// Phase 5: Attendance breaks analysis
echo "═══════════════════════════════════════════════════════════════════════════════\n";
echo "ATTENDANCE BREAKS SUMMARY\n";
echo "═══════════════════════════════════════════════════════════════════════════════\n\n";

$totalBreaks = AttendanceBreak::count();
$bioBreaks = AttendanceBreak::where('source', 'biometric')->count();
$manualBreaks = AttendanceBreak::where('source', 'manual')->orWhereNull('source')->count();

echo "Total break records: $totalBreaks\n";
echo "Biometric breaks: $bioBreaks\n";
echo "Manual/null breaks: $manualBreaks\n\n";

// Phase 6: Biometric events that might be blocked
echo "═══════════════════════════════════════════════════════════════════════════════\n";
echo "BIOMETRIC EVENTS PROCESSING STATUS\n";
echo "═══════════════════════════════════════════════════════════════════════════════\n\n";

$allBioEvents = BiometricEvent::count();
$pendingBioEvents = BiometricEvent::where('processing_status', 'pending')->count();
$processedBioEvents = BiometricEvent::where('processing_status', 'processed')->count();
$errorBioEvents = BiometricEvent::where('processing_status', 'error')->count();
$blockedByManualConflict = BiometricEvent::where('error_reason', 'manual_attendance_conflict')->count();

echo "Total biometric events: $allBioEvents\n";
echo "Pending: $pendingBioEvents\n";
echo "Processed: $processedBioEvents\n";
echo "Errors: $errorBioEvents\n";
echo "Blocked by manual_attendance_conflict: $blockedByManualConflict\n\n";

if ($blockedByManualConflict > 0) {
    echo "Biometric events blocked by manual attendance conflict:\n";
    $blocked = BiometricEvent::where('error_reason', 'manual_attendance_conflict')
        ->with('user')
        ->orderBy('local_punch_time', 'desc')
        ->take(10)
        ->get();

    foreach ($blocked as $evt) {
        $empCode = $evt->employee_code ?? $evt->user?->employee_code ?? 'Unknown';
        echo "  [Event ID: {$evt->id}] Employee: $empCode | Date: {$evt->local_punch_time} | Status: {$evt->processing_status}\n";
    }
}

echo "\n═══════════════════════════════════════════════════════════════════════════════\n";
echo "AUDIT COMPLETE\n";
echo "═══════════════════════════════════════════════════════════════════════════════\n\n";
