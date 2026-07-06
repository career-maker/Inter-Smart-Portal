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
    /**
     * Process specific biometric events.
     *
     * @param array $eventIds
     * @return array
     */
    public function processEvents(array $eventIds): array
    {
        $processed = 0;
        $errors = 0;

        // Group the targeted events by employee_code to minimize queries
        $events = BiometricEvent::whereIn('id', $eventIds)
            ->where('processing_status', 'pending')
            ->get()
            ->groupBy('employee_code');

        foreach ($events as $employeeCode => $employeeEvents) {
            $user = User::where('employee_code', $employeeCode)->first();

            if (!$user) {
                // Mark all events for this unmatched employee as error
                BiometricEvent::whereIn('id', $employeeEvents->pluck('id'))->update([
                    'processing_status' => 'error',
                    'error_reason' => 'unmatched_employee',
                ]);
                $errors += $employeeEvents->count();
                continue;
            }

            // Map the events to the user
            BiometricEvent::whereIn('id', $employeeEvents->pluck('id'))->update([
                'user_id' => $user->id,
                'mapping_status' => 'mapped',
            ]);

            // Re-fetch to ensure we have the updated user_id
            $mappedEvents = BiometricEvent::whereIn('id', $employeeEvents->pluck('id'))->get();

            // Group by date in the local timezone of the punch
            $groupedByDate = $mappedEvents->groupBy(function ($event) {
                return Carbon::parse($event->local_punch_time)->format('Y-m-d');
            });

            foreach ($groupedByDate as $dateString => $dailyEvents) {
                try {
                    DB::transaction(function () use ($user, $dateString, $dailyEvents, &$processed, &$errors) {
                        // Check for manual attendance conflict
                        $manualAttendance = Attendance::where('user_id', $user->id)
                            ->where('date', $dateString)
                            ->where('source', 'manual')
                            ->first();

                        if ($manualAttendance) {
                            BiometricEvent::whereIn('id', $dailyEvents->pluck('id'))->update([
                                'processing_status' => 'error',
                                'error_reason' => 'manual_attendance_conflict',
                            ]);
                            $errors += $dailyEvents->count();
                            return;
                        }

                        // Fetch ALL mapped events for this user on this date (not just the pending ones)
                        // to derive the true daily timeline from scratch.
                        $allDayEvents = BiometricEvent::where('user_id', $user->id)
                            ->whereDate('local_punch_time', $dateString)
                            ->orderBy('local_punch_time', 'asc')
                            ->get();

                        // Cross-midnight check: Are there any events that belong to a cross-midnight sequence?
                        // For a robust check without guessing, if the day starts with an OUT or ends with a hanging IN
                        // that crosses midnight into another date, we mark for review. 
                        // Actually, if we see an OUT before any IN on this day, or if we have missing pairs, 
                        // we can process what we safely can, but the rules state "cross-midnight must go to review/error without guessing".
                        
                        // Let's implement a strict timeline builder
                        $timeline = [];
                        $firstIn = null;
                        $lastOut = null;
                        
                        $currentState = 'outside'; // outside or inside
                        
                        foreach ($allDayEvents as $evt) {
                            if ($evt->direction === 'in') {
                                if ($currentState === 'outside') {
                                    $timeline[] = ['type' => 'in', 'time' => Carbon::parse($evt->local_punch_time)];
                                    $currentState = 'inside';
                                }
                                // If inside, it's consecutive IN -> IN. Earliest IN is retained, so we skip subsequent INs.
                            } elseif ($evt->direction === 'out') {
                                if ($currentState === 'inside') {
                                    $timeline[] = ['type' => 'out', 'time' => Carbon::parse($evt->local_punch_time)];
                                    $currentState = 'outside';
                                } elseif ($currentState === 'outside') {
                                    // Consecutive OUT -> OUT. Replace the previous OUT candidate with this latest OUT.
                                    if (count($timeline) > 0 && end($timeline)['type'] === 'out') {
                                        $timeline[count($timeline) - 1]['time'] = Carbon::parse($evt->local_punch_time);
                                    } else {
                                        // Starting the day with an OUT! This implies cross-midnight from the previous day.
                                        BiometricEvent::whereIn('id', $dailyEvents->pluck('id'))->update([
                                            'processing_status' => 'error',
                                            'error_reason' => 'cross_midnight_review',
                                        ]);
                                        $errors += $dailyEvents->count();
                                        return;
                                    }
                                }
                            }
                        }

                        // If timeline doesn't end with OUT, it's an open sequence (missing OUT).
                        // "incomplete/open sequences must not invent times"
                        // But wait! If it's still an open sequence (e.g. employee hasn't clocked out yet),
                        // we should still process the IN and any completed breaks. We just won't have a final checkout.
                        
                        if (count($timeline) > 0 && $timeline[0]['type'] === 'in') {
                            $checkInTime = $timeline[0]['time'];
                            $checkOutTime = null;
                            $breaks = [];
                            
                            $currentBreakStart = null;
                            
                            for ($i = 1; $i < count($timeline); $i++) {
                                $point = $timeline[$i];
                                
                                if ($point['type'] === 'out') {
                                    // This is a candidate for checkout or break start
                                    $checkOutTime = $point['time'];
                                    $currentBreakStart = $point['time'];
                                } elseif ($point['type'] === 'in') {
                                    // This closes a break
                                    if ($currentBreakStart) {
                                        $breaks[] = [
                                            'start' => $currentBreakStart,
                                            'end' => $point['time']
                                        ];
                                        $currentBreakStart = null;
                                        $checkOutTime = null; // The previous OUT was a break start, not the final checkout
                                    }
                                }
                            }

                            // Calculate total working minutes
                            $totalWorkingMinutes = null;
                            if ($checkOutTime) {
                                $totalWorkingMinutes = (int) floor($checkInTime->diffInMinutes($checkOutTime));
                                foreach ($breaks as $b) {
                                    $totalWorkingMinutes -= (int) floor($b['start']->diffInMinutes($b['end']));
                                }
                            }

                            // Save to database (Idempotent: clear previous biometric attendance for this day)
                            $attendance = Attendance::where('user_id', $user->id)
                                ->where('date', $dateString)
                                ->where('source', 'biometric')
                                ->first();

                            if ($attendance) {
                                // Clear old biometric breaks
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
                            $attendance->status = 'Present'; // Simplified status mapping
                            $attendance->save();

                            // Save breaks
                            foreach ($breaks as $b) {
                                $breakRecord = new AttendanceBreak();
                                $breakRecord->attendance_id = $attendance->id;
                                $breakRecord->source = 'biometric';
                                $breakRecord->break_start = $b['start'];
                                $breakRecord->break_end = $b['end'];
                                $breakRecord->total_break_minutes = (int) floor($b['start']->diffInMinutes($b['end']));
                                $breakRecord->save();
                            }

                            // Mark the events as successfully processed
                            BiometricEvent::whereIn('id', $dailyEvents->pluck('id'))->update([
                                'processing_status' => 'processed',
                                'error_reason' => null,
                            ]);
                            $processed += $dailyEvents->count();
                        } else {
                            // Empty timeline or invalid start
                            BiometricEvent::whereIn('id', $dailyEvents->pluck('id'))->update([
                                'processing_status' => 'error',
                                'error_reason' => 'invalid_sequence',
                            ]);
                            $errors += $dailyEvents->count();
                        }

                    });
                } catch (Throwable $e) {
                    BiometricEvent::whereIn('id', $dailyEvents->pluck('id'))->update([
                        'processing_status' => 'error',
                        'error_reason' => 'processing_failed',
                    ]);
                    $errors += $dailyEvents->count();
                }
            }
        }

        return ['processed' => $processed, 'errors' => $errors];
    }
}
