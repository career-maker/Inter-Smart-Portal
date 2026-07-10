<?php

namespace App\Console\Commands;

use App\Models\Attendance;
use App\Models\BiometricEvent;
use App\Services\BiometricTimelineService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class FixAttendanceTimezoneCorruption extends Command
{
    protected $signature = 'attendance:fix-timezone-corruption {--date= : Specific date (Y-m-d)}';

    protected $description = 'Fix timezone-corrupted punch times by recalculating from biometric events';

    public function __construct(
        private readonly BiometricTimelineService $timeline
    ) {
        parent::__construct();
    }

    public function handle()
    {
        $startDate = $this->option('date')
            ? Carbon::parse($this->option('date'))->toDateString()
            : '2026-07-01';

        $endDate = $this->option('date')
            ? Carbon::parse($this->option('date'))->toDateString()
            : Carbon::today('Asia/Kolkata')->toDateString();

        $this->info("Fixing timezone corruption from {$startDate} to {$endDate}");

        $records = Attendance::whereBetween('date', [$startDate, $endDate])
            ->orderBy('date', 'desc')
            ->orderBy('user_id', 'asc')
            ->get();

        $fixed = 0;
        $skipped = 0;

        foreach ($records as $attendance) {
            try {
                $dateString = $attendance->date->toDateString();
                $userId = $attendance->user_id;

                // Fetch raw biometric events for this date
                $rawEvents = BiometricEvent::where('user_id', $userId)
                    ->whereDate('local_punch_time', $dateString)
                    ->orderBy('local_punch_time', 'asc')
                    ->get();

                if ($rawEvents->isEmpty()) {
                    $skipped++;
                    continue;
                }

                // Use BiometricTimelineService to get accurate times
                $build = $this->timeline->buildTimeline($rawEvents, false);
                if (!$build['ok']) {
                    $this->warn("Failed to build timeline for user {$userId} on {$dateString}");
                    $skipped++;
                    continue;
                }

                $interp = $this->timeline->interpretTimeline($build['timeline'], $dateString);

                // Extract first_in and last_out (already in correct UTC times from service)
                $firstIn = $interp['first_in'];
                $lastOut = $interp['last_out'];

                if (!$firstIn && !$lastOut) {
                    $skipped++;
                    continue;
                }

                // Update attendance record with correct times
                $updateData = [];

                if ($firstIn && (!$attendance->check_in_time ||
                    $attendance->check_in_time->format('Y-m-d H:i') !== $firstIn->format('Y-m-d H:i'))) {
                    $updateData['check_in_time'] = $firstIn;
                }

                if ($lastOut && (!$attendance->check_out_time ||
                    $attendance->check_out_time->format('Y-m-d H:i') !== $lastOut->format('Y-m-d H:i'))) {
                    $updateData['check_out_time'] = $lastOut;
                }

                if (!empty($updateData)) {
                    $updateData['source'] = 'biometric';

                    // Also recalculate total_working_minutes
                    if ($firstIn && $lastOut) {
                        $totalMinutes = $firstIn->diffInMinutes($lastOut);
                        $breakMinutes = array_sum(array_column($interp['completed_breaks'] ?? [], 'minutes'));
                        $updateData['total_working_minutes'] = max(0, (int) round($totalMinutes - $breakMinutes));
                    }

                    $attendance->update($updateData);
                    $fixed++;
                    $this->line("Fixed: {$userId} on {$dateString}");
                } else {
                    $skipped++;
                }
            } catch (\Exception $e) {
                $this->error("Error fixing user {$attendance->user_id} on {$attendance->date}: " . $e->getMessage());
                $skipped++;
            }
        }

        $this->info("Complete. Fixed: {$fixed}, Skipped: {$skipped}");
    }
}
