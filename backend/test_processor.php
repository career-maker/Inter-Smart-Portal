<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Models\BiometricEvent;
use App\Models\Attendance;
use App\Models\AttendanceBreak;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

$employeeEvents = BiometricEvent::whereIn('id', [7,8,9,10,11,12,13])->get();
$user = User::where('employee_code', '272')->first();
$dateString = '2026-07-03';
$dailyEvents = $employeeEvents;

$allDayEvents = BiometricEvent::where('user_id', $user->id)
    ->whereDate('local_punch_time', $dateString)
    ->orderBy('local_punch_time', 'asc')
    ->get();

$timeline = [];
$firstIn = null;
$lastOut = null;
$currentState = 'outside'; 

foreach ($allDayEvents as $evt) {
    if ($evt->direction === 'in') {
        if ($currentState === 'outside') {
            $timeline[] = ['type' => 'in', 'time' => Carbon::parse($evt->local_punch_time)];
            $currentState = 'inside';
        }
    } elseif ($evt->direction === 'out') {
        if ($currentState === 'inside') {
            $timeline[] = ['type' => 'out', 'time' => Carbon::parse($evt->local_punch_time)];
            $currentState = 'outside';
        } elseif ($currentState === 'outside') {
            if (count($timeline) > 0 && end($timeline)['type'] === 'out') {
                $timeline[count($timeline) - 1]['time'] = Carbon::parse($evt->local_punch_time);
            } else {
                echo "Cross midnight review!\n";
                exit;
            }
        }
    }
}

if (count($timeline) > 0 && $timeline[0]['type'] === 'in') {
    $checkInTime = $timeline[0]['time'];
    $checkOutTime = null;
    $breaks = [];
    $currentBreakStart = null;
    
    for ($i = 1; $i < count($timeline); $i++) {
        $point = $timeline[$i];
        if ($point['type'] === 'out') {
            $checkOutTime = $point['time'];
            $currentBreakStart = $point['time'];
        } elseif ($point['type'] === 'in') {
            if ($currentBreakStart) {
                $breaks[] = [
                    'start' => $currentBreakStart,
                    'end' => $point['time']
                ];
                $currentBreakStart = null;
                $checkOutTime = null; 
            }
        }
    }

    $totalWorkingMinutes = null;
    if ($checkOutTime) {
        $totalWorkingMinutes = $checkInTime->diffInMinutes($checkOutTime);
        foreach ($breaks as $b) {
            $totalWorkingMinutes -= $b['start']->diffInMinutes($b['end']);
        }
    }

    $attendance = Attendance::where('user_id', $user->id)
        ->where('date', $dateString)
        ->where('source', 'biometric')
        ->first();

    if ($attendance) {
        AttendanceBreak::where('attendance_id', $attendance->id)->where('source', 'biometric')->delete();
    } else {
        $attendance = new Attendance();
        $attendance->user_id = $user->id;
        $attendance->date = $dateString;
        $attendance->source = 'biometric';
    }
    
    $attendance->check_in_time = $checkInTime;
    $attendance->check_out_time = $checkOutTime;
    $attendance->total_working_minutes = $totalWorkingMinutes;
    $attendance->status = 'Present'; 
    $attendance->save();

    foreach ($breaks as $b) {
        $breakRecord = new AttendanceBreak();
        $breakRecord->attendance_id = $attendance->id;
        $breakRecord->source = 'biometric';
        $breakRecord->break_start = $b['start'];
        $breakRecord->break_end = $b['end'];
        $breakRecord->total_break_minutes = $b['start']->diffInMinutes($b['end']);
        $breakRecord->save();
    }
    
    echo "SUCCESS!\n";
}
