<?php

namespace App\Observers;

use App\Models\BiometricEvent;
use App\Models\Attendance;
use Carbon\Carbon;

class BiometricEventObserver
{
    public function created(BiometricEvent $event)
    {
        // Only process mapped, punch-out events
        if ($event->mapping_status !== 'mapped' || $event->direction !== 'out') {
            return;
        }

        // Get the date from local_punch_time
        $eventDate = Carbon::parse($event->local_punch_time)->toDateString();

        // Find or create attendance record
        $attendance = Attendance::where('user_id', $event->user_id)
            ->where('date', $eventDate)
            ->first();

        if (!$attendance) {
            // Create new attendance record with check-out time
            Attendance::create([
                'user_id' => $event->user_id,
                'date' => $eventDate,
                'check_in_time' => $event->local_punch_time,
                'check_out_time' => $event->local_punch_time,
                'status' => 'Present',
                'source' => 'biometric',
            ]);
        } else {
            // Update existing attendance with check-out time (keep the latest)
            if (!$attendance->check_out_time || Carbon::parse($event->local_punch_time) > Carbon::parse($attendance->check_out_time)) {
                $attendance->update([
                    'check_out_time' => $event->local_punch_time,
                    'source' => 'biometric',
                ]);
            }
        }
    }
}
