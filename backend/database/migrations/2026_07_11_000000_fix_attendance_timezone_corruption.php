<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\Attendance;
use App\Models\BiometricEvent;
use App\Services\BiometricTimelineService;
use Carbon\Carbon;

return new class extends Migration
{
    public function up(): void
    {
        // This migration recalculates all attendance records from biometric data
        // to fix timezone corruption issues across the database.

        $this->command->info('Starting attendance timezone corruption fix...');

        $timeline = app(BiometricTimelineService::class);
        $startDate = '2026-07-01';
        $endDate = Carbon::today('Asia/Kolkata')->toDateString();

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
                $build = $timeline->buildTimeline($rawEvents, false);
                if (!$build['ok']) {
                    $skipped++;
                    continue;
                }

                $interp = $timeline->interpretTimeline($build['timeline'], $dateString);

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

                    // Recalculate total_working_minutes
                    if ($firstIn && $lastOut) {
                        $totalMinutes = $firstIn->diffInMinutes($lastOut);
                        $breakMinutes = array_sum(array_column($interp['completed_breaks'] ?? [], 'minutes'));
                        $updateData['total_working_minutes'] = max(0, (int) round($totalMinutes - $breakMinutes));
                    }

                    $attendance->update($updateData);
                    $fixed++;
                } else {
                    $skipped++;
                }
            } catch (\Exception $e) {
                $this->command->error("Error fixing user {$attendance->user_id} on {$attendance->date}: " . $e->getMessage());
                $skipped++;
            }
        }

        $this->command->info("Attendance timezone fix complete. Fixed: {$fixed}, Skipped: {$skipped}");
    }

    public function down(): void
    {
        // No rollback needed - data is already fixed
    }
};
