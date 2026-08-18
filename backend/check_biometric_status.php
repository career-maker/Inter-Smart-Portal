<?php
// Quick diagnostic script to check biometric system status

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\BiometricEvent;
use App\Models\Attendance;
use Carbon\Carbon;

echo "\n=== BIOMETRIC SYSTEM DIAGNOSTIC ===\n\n";

// Check recent events
echo "1. RECENT BIOMETRIC EVENTS:\n";
$recentEvents = BiometricEvent::orderBy('created_at', 'desc')->limit(5)->get(['id', 'employee_code', 'direction', 'created_at', 'processing_status']);

if ($recentEvents->isEmpty()) {
    echo "   ❌ NO EVENTS FOUND!\n";
} else {
    foreach ($recentEvents as $e) {
        echo "   • ID {$e->id}: {$e->employee_code} ({$e->direction}) - {$e->created_at} - {$e->processing_status}\n";
    }
}

// Check when last event came in
echo "\n2. LAST EVENT TIMESTAMP:\n";
$lastEvent = BiometricEvent::orderBy('created_at', 'desc')->first(['created_at']);
if ($lastEvent) {
    $ago = $lastEvent->created_at->diffForHumans();
    echo "   ✓ {$lastEvent->created_at} ({$ago})\n";
} else {
    echo "   ❌ NO EVENTS AT ALL\n";
}

// Check today's attendance
echo "\n3. TODAY'S ATTENDANCE (Biometric Source):\n";
$today = Carbon::today()->toDateString();
$todayAttendance = Attendance::where('date', $today)->where('source', 'biometric')->count();
echo "   • Records: {$todayAttendance}\n";

if ($todayAttendance > 0) {
    $withCheckIn = Attendance::where('date', $today)->where('source', 'biometric')->whereNotNull('check_in_time')->count();
    echo "   • With check-in: {$withCheckIn}\n";
}

// Check processing status distribution
echo "\n4. EVENT PROCESSING STATUS:\n";
$statusCounts = BiometricEvent::select('processing_status')
    ->groupBy('processing_status')
    ->selectRaw('count(*) as count')
    ->get();

foreach ($statusCounts as $status) {
    echo "   • {$status->processing_status}: {$status->count}\n";
}

// Check for errors
echo "\n5. ERROR EVENTS:\n";
$errorEvents = BiometricEvent::where('processing_status', 'error')->limit(3)->get(['id', 'employee_code', 'error_reason']);
if ($errorEvents->isEmpty()) {
    echo "   ✓ No error events\n";
} else {
    foreach ($errorEvents as $e) {
        echo "   • ID {$e->id}: {$e->employee_code} - {$e->error_reason}\n";
    }
}

echo "\n=== INTERPRETATION ===\n";

if ($recentEvents->isEmpty()) {
    echo "\n🔴 PROBLEM: No biometric events are being received!\n";
    echo "   This means: Agent is not sending data to the API\n";
    echo "\n   Possible causes:\n";
    echo "   1. Agent is not running\n";
    echo "   2. Agent .env is not configured\n";
    echo "   3. Agent DRY_RUN=true (test mode)\n";
    echo "   4. Backend API is not accessible\n";
    echo "   5. Agent authentication failing\n";
} else if ($lastEvent && $lastEvent->created_at->diffInHours(Carbon::now()) > 1) {
    echo "\n🟡 WARNING: Last event was {$lastEvent->created_at->diffForHumans()}\n";
    echo "   Agent may have stopped sending data\n";
} else {
    echo "\n🟢 GOOD: Events are being received\n";
}

echo "\n";
?>
