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
     * Process specific biometric events and reconcile daily timelines.
     *
     * When new events arrive, rebuild the COMPLETE daily timeline for affected
     * employees and dates. This ensures current-day state (checkout vs working)
     * never becomes stale when later INs arrive after OUTs.
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

                        // â”€â”€ Canonical timeline build â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

                        // â”€â”€ Interpret timeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                        $interp = $this->timeline->interpretTimeline($builtTimeline, $dateString);

                        $checkInTime         = $interp['first_in'];
                        $checkOutTime        = $interp['is_currently_working'] ? null : $interp['last_out'];
                        $totalWorkingMinutes = $interp['total_working_minutes'];
                        $breaks              = $interp['completed_breaks'];

                        // â”€â”€ Idempotent upsert â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

                        // Mark ALL relevant events as processed (including dependent invalid_sequence)
                        // Get ALL events for this user/date to mark them as processed, since
                        // reconciliation reads and validates all of them together
                        // BUT: exclude orphan leading OUTs that are marked as 'ignored'
                        $allDayEventIds = BiometricEvent::where('user_id', $user->id)
                            ->whereDate('local_punch_time', $dateString)
                            ->where('processing_status', '!=', 'ignored')
                            ->pluck('id')
                            ->toArray();

                        if (!empty($allDayEventIds)) {
                            BiometricEvent::whereIn('id', $allDayEventIds)->update([
                                'processing_status' => 'processed',
                                'error_reason'      => null,
                                'mapping_status'    => 'mapped',
                            ]);
                        }

                        $processed += $dailyEvents->count();
                    });

                    // After transaction completes, reconcile the daily timeline
                    // This ensures current-day state never becomes stale when later
                    // IN events arrive after OUTs
                    $this->reconcileDailyTimeline($user, $dateString);
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

    /**
     * Reconcile complete daily timeline for an employee and date.
     *
     * INTERNAL: Called by processEvents after each date-group processing.
     * Rebuilds the FULL daily timeline from all relevant events and ensures
     * attendance record matches canonical state (critical for current-day state).
     *
     * @param  \App\Models\User $user
     * @param  string $dateString YYYY-MM-DD
     * @return void
     */
    private function reconcileDailyTimeline(User $user, string $dateString): void
    {
        // Fetch ALL events for this user on this date, regardless of processing status
        $allDayEvents = BiometricEvent::where('user_id', $user->id)
            ->whereDate('local_punch_time', $dateString)
            ->orderBy('local_punch_time', 'asc')
            ->get();

        if ($allDayEvents->isEmpty()) {
            return;
        }

        // Check manual attendance conflict
        $manualAttendance = Attendance::where('user_id', $user->id)
            ->where('date', $dateString)
            ->where('source', 'manual')
            ->first();

        if ($manualAttendance) {
            return; // Do not overwrite manual records
        }

        // Rebuild canonical timeline
        $previousDate = Carbon::parse($dateString)->subDay()->format('Y-m-d');
        $hasOpenPreviousShift = Attendance::where('user_id', $user->id)
            ->where('date', $previousDate)
            ->where('source', 'biometric')
            ->whereNotNull('check_in_time')
            ->whereNull('check_out_time')
            ->exists();

        $build = $this->timeline->buildTimeline($allDayEvents, $hasOpenPreviousShift);

        if (!$build['ok']) {
            return;
        }

        $builtTimeline = $build['timeline'];

        if (empty($builtTimeline) || $builtTimeline[0]['type'] !== 'in') {
            return;
        }

        // Interpret timeline
        $interp = $this->timeline->interpretTimeline($builtTimeline, $dateString);

        // Derive final state
        $checkInTime = $interp['first_in'];
        $checkOutTime = $interp['is_currently_working'] ? null : $interp['last_out'];
        $totalWorkingMinutes = $interp['total_working_minutes'];
        $breaks = $interp['completed_breaks'];

        // Fetch or create attendance
        $attendance = Attendance::where('user_id', $user->id)
            ->where('date', $dateString)
            ->where('source', 'biometric')
            ->first();

        if ($attendance) {
            // Delete old breaks before updating
            AttendanceBreak::where('attendance_id', $attendance->id)
                ->where('source', 'biometric')
                ->delete();
        } else {
            $attendance = new Attendance();
            $attendance->user_id = $user->id;
            $attendance->date = $dateString;
            $attendance->source = 'biometric';
        }

        // Update with canonical state
        $attendance->check_in_time = $checkInTime;
        $attendance->check_out_time = $checkOutTime;
        $attendance->total_working_minutes = $totalWorkingMinutes;
        $attendance->status = 'Present';
        $attendance->save();

        // Recreate breaks
        foreach ($breaks as $b) {
            $breakRecord = new AttendanceBreak();
            $breakRecord->attendance_id = $attendance->id;
            $breakRecord->source = 'biometric';
            $breakRecord->break_start = $b['start'];
            $breakRecord->break_end = $b['end'];
            $breakRecord->total_break_minutes = $b['minutes'];
            $breakRecord->save();
        }
    }

    /**
     * Recover orphaned biometric events for an employee_code that previously
     * failed with unmatched_employee error.
     *
     * When an employee is created or updated with an employee_code that has
     * historical unmatched_employee events, this method reprocesses those events
     * and any dependent invalid_sequence events to rebuild affected timelines.
     *
     * @param  string $employeeCode
     * @return array{recovered: int, errors: int}
     */
    public function recoverOrphanedEventsForEmployeeCode(string $employeeCode): array
    {
        $recovered = 0;
        $errors = 0;

        // Find all unmatched_employee events for this employee_code
        $orphanedEventIds = BiometricEvent::where('employee_code', $employeeCode)
            ->where('processing_status', 'error')
            ->where('error_reason', 'unmatched_employee')
            ->pluck('id')
            ->toArray();

        if (empty($orphanedEventIds)) {
            return ['recovered' => 0, 'errors' => 0];
        }

        // Now that employee exists in portal, reprocess these events
        $results = $this->processEvents($orphanedEventIds);

        return $results;
    }
}

