<?php

namespace App\Services;

use App\Models\User;
use App\Models\BiometricEvent;
use App\Models\Attendance;
use App\Models\AttendanceBreak;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use Throwable;

class BiometricProcessorService
{
    public function __construct(
        private readonly BiometricTimelineService $timeline
    ) {}

    /**
     * Process specific biometric events.
     *
     * @param  array $eventIds
     * @return array{processed: int, errors: int}
     */
    public function processEvents(array $eventIds): array
    {
        $processed = 0;
        $errors    = 0;

        // Group targeted events by employee_code
        $events = BiometricEvent::whereIn('id', $eventIds)
            ->whereIn('processing_status', ['pending', 'error', 'processed'])
            ->get()
            ->groupBy('employee_code');

        foreach ($events as $employeeCode => $employeeEvents) {
            $user = User::where('employee_code', $employeeCode)->first();

            if (!$user) {
                BiometricEvent::whereIn('id', $employeeEvents->pluck('id'))->update([
                    'processing_status' => 'error',
                    'error_reason'      => 'unmatched_employee',
                ]);
                $errors += $employeeEvents->count();
                continue;
            }

            // Map events to the resolved user
            BiometricEvent::whereIn('id', $employeeEvents->pluck('id'))->update([
                'user_id'        => $user->id,
                'mapping_status' => 'mapped',
            ]);

            // Re-fetch with updated user_id
            $mappedEvents = BiometricEvent::whereIn('id', $employeeEvents->pluck('id'))->get();

            // Group by local calendar date
            $groupedByDate = $mappedEvents->groupBy(function ($event) {
                return Carbon::parse($event->local_punch_time)->format('Y-m-d');
            });

            foreach ($groupedByDate as $dateString => $dailyEvents) {
                try {
                    DB::transaction(function () use (
                        $user, $dateString, $dailyEvents, &$processed, &$errors
                    ) {
                        // Manual attendance conflict check
                        $manualAttendance = Attendance::where('user_id', $user->id)
                            ->where('date', $dateString)
                            ->where('source', 'manual')
                            ->first();

                        if ($manualAttendance) {
                            BiometricEvent::whereIn('id', $dailyEvents->pluck('id'))->update([
                                'processing_status' => 'error',
                                'error_reason'      => 'manual_attendance_conflict',
                            ]);
                            $errors += $dailyEvents->count();
                            return;
                        }

                        // Fetch ALL mapped events for this user on this date
                        $allDayEvents = BiometricEvent::where('user_id', $user->id)
                            ->whereDate('local_punch_time', $dateString)
                            ->orderBy('local_punch_time', 'asc')
                            ->get();

                        // Check for genuine previous-day open shift
                        $previousDate        = Carbon::parse($dateString)->subDay()->format('Y-m-d');
                        $hasOpenPreviousShift = Attendance::where('user_id', $user->id)
                            ->where('date', $previousDate)
                            ->where('source', 'biometric')
                            ->whereNotNull('check_in_time')
                            ->whereNull('check_out_time')
                            ->exists();

                        // ── Canonical timeline build ──────────────────────────────
                        $build = $this->timeline->buildTimeline($allDayEvents, $hasOpenPreviousShift);

                        if (!$build['ok']) {
                            // cross_midnight_review or other hard error
                            BiometricEvent::whereIn('id', $dailyEvents->pluck('id'))->update([
                                'processing_status' => 'error',
                                'error_reason'      => $build['error'],
                            ]);
                            $errors += $dailyEvents->count();
                            return;
                        }

                        $builtTimeline   = $build['timeline'];
                        $orphanEventIds  = $build['orphan_event_ids'];

                        // Must begin with an IN after orphan filtering
                        if (empty($builtTimeline) || $builtTimeline[0]['type'] !== 'in') {
                            BiometricEvent::whereIn('id', $dailyEvents->pluck('id'))->update([
                                'processing_status' => 'error',
                                'error_reason'      => 'invalid_sequence',
                            ]);
                            $errors += $dailyEvents->count();
                            return;
                        }

                        // ── Interpret timeline ────────────────────────────────────
                        $interp = $this->timeline->interpretTimeline($builtTimeline, $dateString);

                        $checkInTime         = $interp['first_in'];
                        $checkOutTime        = $interp['last_out'];
                        $totalWorkingMinutes = $interp['total_working_minutes'];
                        $breaks              = $interp['completed_breaks'];

                        // ── Idempotent upsert ─────────────────────────────────────
                        $attendance = Attendance::where('user_id', $user->id)
                            ->where('date', $dateString)
                            ->where('source', 'biometric')
                            ->first();

                        if ($attendance) {
                            AttendanceBreak::where('attendance_id', $attendance->id)
                                ->where('source', 'biometric')
                                ->delete();
                        } else {
                            $attendance          = new Attendance();
                            $attendance->user_id = $user->id;
                            $attendance->date    = $dateString;
                            $attendance->source  = 'biometric';
                        }

                        $attendance->check_in_time         = $checkInTime;
                        $attendance->check_out_time        = $checkOutTime;
                        $attendance->total_working_minutes = $totalWorkingMinutes;
                        $attendance->status                = 'Present';
                        $attendance->save();

                        // Save completed breaks
                        foreach ($breaks as $b) {
                            $breakRecord                     = new AttendanceBreak();
                            $breakRecord->attendance_id      = $attendance->id;
                            $breakRecord->source             = 'biometric';
                            $breakRecord->break_start        = $b['start'];
                            $breakRecord->break_end          = $b['end'];
                            $breakRecord->total_break_minutes = $b['minutes'];
                            $breakRecord->save();
                        }

                        // Mark orphan leading OUTs as ignored
                        if (!empty($orphanEventIds)) {
                            BiometricEvent::whereIn('id', $orphanEventIds)
                                ->whereIn('id', $dailyEvents->pluck('id'))
                                ->update([
                                    'processing_status' => 'ignored',
                                    'error_reason'      => 'orphan_leading_out',
                                ]);
                        }

                        // Mark valid events as processed
                        $processedEventIds = $dailyEvents->pluck('id')
                            ->diff($orphanEventIds)
                            ->toArray();

                        if (!empty($processedEventIds)) {
                            BiometricEvent::whereIn('id', $processedEventIds)->update([
                                'processing_status' => 'processed',
                                'error_reason'      => null,
                            ]);
                        }

                        $processed += $dailyEvents->count();
                    });
                } catch (Throwable $e) {
                    BiometricEvent::whereIn('id', $dailyEvents->pluck('id'))->update([
                        'processing_status' => 'error',
                        'error_reason'      => 'processing_failed',
                    ]);
                    $errors += $dailyEvents->count();
                }
            }
        }

        return ['processed' => $processed, 'errors' => $errors];
    }
}
