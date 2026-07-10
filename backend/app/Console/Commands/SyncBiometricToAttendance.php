<?php

namespace App\Console\Commands;

use App\Models\Attendance;
use App\Models\BiometricEvent;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SyncBiometricToAttendance extends Command
{
    protected $signature = 'attendance:sync-biometric {--date= : Specific date to sync (Y-m-d)}';

    protected $description = 'Sync biometric punch events to attendance records (update check_out_time when punch-out is recorded)';

    public function handle()
    {
        $targetDate = $this->option('date') ? Carbon::parse($this->option('date'))->toDateString() : Carbon::today()->toDateString();

        $this->info("Syncing biometric events to attendance for date: {$targetDate}");

        // Get all biometric punch-out events for the target date
        $punchOutEvents = BiometricEvent::whereDate(DB::raw("DATE(local_punch_time)"), $targetDate)
            ->where('direction', 'out')
            ->where('mapping_status', 'mapped')
            ->get();

        if ($punchOutEvents->isEmpty()) {
            $this->info("No punch-out events found for {$targetDate}");
            return;
        }

        $synced = 0;
        $errors = 0;

        foreach ($punchOutEvents as $event) {
            try {
                $attendance = Attendance::where('user_id', $event->user_id)
                    ->where('date', $targetDate)
                    ->first();

                if (!$attendance) {
                    // Create attendance record if it doesn't exist
                    $attendance = Attendance::create([
                        'user_id' => $event->user_id,
                        'date' => $targetDate,
                        'check_in_time' => $event->local_punch_time,
                        'check_out_time' => $event->local_punch_time,
                        'status' => 'Present',
                        'source' => 'biometric',
                    ]);
                    $synced++;
                    continue;
                }

                // Update check_out_time if not already set or if this is a later punch
                if (!$attendance->check_out_time || Carbon::parse($event->local_punch_time) > Carbon::parse($attendance->check_out_time)) {
                    $attendance->update([
                        'check_out_time' => $event->local_punch_time,
                        'source' => 'biometric',
                    ]);
                    $synced++;
                }
            } catch (\Exception $e) {
                $this->error("Error syncing event {$event->id}: " . $e->getMessage());
                $errors++;
            }
        }

        $this->info("Sync complete. Updated: {$synced}, Errors: {$errors}");
    }
}
