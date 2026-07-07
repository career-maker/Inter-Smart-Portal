<?php

namespace App\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * BiometricTimelineService
 *
 * Single canonical source of truth for interpreting raw biometric
 * punch sequences. Used by:
 *   - BiometricProcessorService (write path)
 *   - AttendanceController::details() (read path)
 *   - Tests
 *
 * RULES
 * ─────
 * first_in   → earliest valid IN punch of the day (after stripping orphan leading OUTs)
 * last_out   → latest valid OUT punch *before* the last unmatched IN, i.e. the most
 *              recent OUT that closed a working session. Never updated retroactively
 *              just because a later unmatched IN exists.
 * consecutive INs  → first IN retained; later consecutive INs skipped.
 * consecutive OUTs → last OUT retained (replaces the previous OUT candidate) as it
 *                    is the break start / checkout.
 * final unmatched IN → last_out remains the last real checkout; a flag
 *                      has_missing_punch_out = true is raised for historical days,
 *                      is_currently_working = true for the current day.
 * final unmatched OUT (day ends on OUT) → ordinary complete shift.
 * orphan leading OUTs → collected, returned as orphan_event_ids. Caller decides
 *                        how to persist them.
 */
class BiometricTimelineService
{
    /**
     * Build a canonical, cleaned timeline from a raw collection of events.
     *
     * @param  Collection  $rawEvents   Eloquent collection ordered by local_punch_time ASC.
     *                                  Each item must expose ->direction ('in'|'out'),
     *                                  ->local_punch_time (string or Carbon), ->id.
     * @param  bool        $hasOpenPreviousShift  Whether a genuine prior-day open
     *                                            biometric shift exists.
     * @return array{
     *   ok: bool,
     *   error: string|null,
     *   cross_midnight: bool,
     *   timeline: array,
     *   orphan_event_ids: array,
     * }
     */
    public function buildTimeline(Collection $rawEvents, bool $hasOpenPreviousShift = false): array
    {
        $timeline         = [];   // [{type:'in'|'out', time:Carbon, event_id:int}]
        $orphanEventIds   = [];
        $currentState     = 'outside'; // 'outside' | 'inside'

        foreach ($rawEvents as $evt) {
            $time = Carbon::parse($evt->local_punch_time);

            if ($evt->direction === 'in') {
                if ($currentState === 'outside') {
                    // Valid transition: outside → inside
                    $timeline[]   = ['type' => 'in', 'time' => $time, 'event_id' => $evt->id];
                    $currentState = 'inside';
                }
                // else: consecutive IN while already inside → skip (first IN retained)

            } elseif ($evt->direction === 'out') {
                if ($currentState === 'inside') {
                    // Valid transition: inside → outside
                    $timeline[]   = ['type' => 'out', 'time' => $time, 'event_id' => $evt->id];
                    $currentState = 'outside';

                } elseif ($currentState === 'outside') {
                    if (count($timeline) > 0 && end($timeline)['type'] === 'out') {
                        // Consecutive OUTs while outside → replace with latest OUT
                        $timeline[count($timeline) - 1] = [
                            'type'     => 'out',
                            'time'     => $time,
                            'event_id' => $evt->id,
                        ];
                    } else {
                        // Day starts with OUT (no prior IN in timeline)
                        if ($hasOpenPreviousShift) {
                            // Genuine cross-midnight case – caller must handle
                            return [
                                'ok'               => false,
                                'error'            => 'cross_midnight_review',
                                'cross_midnight'   => true,
                                'timeline'         => [],
                                'orphan_event_ids' => [],
                            ];
                        }
                        // Orphan leading OUT
                        $orphanEventIds[] = $evt->id;
                    }
                }
            }
        }

        return [
            'ok'               => true,
            'error'            => null,
            'cross_midnight'   => false,
            'timeline'         => $timeline,
            'orphan_event_ids' => $orphanEventIds,
        ];
    }

    /**
     * Interpret a cleaned timeline into a full daily summary.
     *
     * @param  array  $timeline   Output of buildTimeline()['timeline']
     * @param  string $dateString 'Y-m-d'  – used to determine if the day is historical
     * @return array{
     *   first_in: Carbon|null,
     *   last_out: Carbon|null,
     *   current_sequence_state: string,   'outside'|'inside'|'empty'
     *   is_currently_working: bool,
     *   has_missing_punch_out: bool,
     *   requires_review: bool,
     *   total_working_minutes: int|null,
     *   completed_breaks: array,          [{start:Carbon, end:Carbon, minutes:int}]
     *   open_break_start: Carbon|null,    non-null when final event is OUT and day is today
     *   working_sessions: array,          [{start:Carbon, end:Carbon|null, minutes:int|null}]
     *   raw_punches: array,               [{type:string, time:Carbon, event_id:int}]
     * }
     */
    public function interpretTimeline(array $timeline, string $dateString): array
    {
        $isToday         = Carbon::parse($dateString)->isToday();
        $firstIn         = null;
        $lastOut         = null;          // Last OUT that *closed* a session
        $currentState    = 'empty';
        $completedBreaks = [];
        $workingSessions = [];

        // State tracking
        $sessionStart    = null;
        $breakStart      = null;

        foreach ($timeline as $point) {
            if ($point['type'] === 'in') {
                if ($firstIn === null) {
                    $firstIn = $point['time'];
                }

                if ($breakStart !== null) {
                    // Closing a break
                    $completedBreaks[] = [
                        'start'   => $breakStart,
                        'end'     => $point['time'],
                        'minutes' => (int) floor($breakStart->diffInMinutes($point['time'])),
                    ];
                    $breakStart = null;
                }

                $sessionStart = $point['time'];
                $currentState = 'inside';

            } elseif ($point['type'] === 'out') {
                if ($sessionStart !== null) {
                    // Close the working session
                    $workingSessions[] = [
                        'start'   => $sessionStart,
                        'end'     => $point['time'],
                        'minutes' => (int) floor($sessionStart->diffInMinutes($point['time'])),
                    ];
                    $sessionStart = null;
                }

                $lastOut      = $point['time'];
                $breakStart   = $point['time']; // potential break start
                $currentState = 'outside';
            }
        }

        // After iterating: determine final state
        $isMissingPunchOut  = false;
        $isCurrentlyWorking = false;
        $requiresReview     = false;

        if ($currentState === 'inside') {
            // Day ends with an IN – open sequence
            if ($isToday) {
                $isCurrentlyWorking = true;
            } else {
                $isMissingPunchOut = true;
                $requiresReview    = true;
            }
        }

        // Add the open/incomplete working session (no end time)
        if ($sessionStart !== null) {
            $workingSessions[] = [
                'start'   => $sessionStart,
                'end'     => null,
                'minutes' => null,
            ];
        }

        // Total working minutes: sum only completed sessions
        $totalWorkingMinutes = null;
        $completedSessionMinutes = array_reduce(
            array_filter($workingSessions, fn($s) => $s['end'] !== null),
            fn($carry, $s) => $carry + $s['minutes'],
            0
        );
        if (count(array_filter($workingSessions, fn($s) => $s['end'] !== null)) > 0) {
            $totalWorkingMinutes = $completedSessionMinutes;
        }

        return [
            'first_in'               => $firstIn,
            'last_out'               => $lastOut,
            'current_sequence_state' => $currentState,
            'is_currently_working'   => $isCurrentlyWorking,
            'has_missing_punch_out'  => $isMissingPunchOut,
            'requires_review'        => $requiresReview,
            'total_working_minutes'  => $totalWorkingMinutes,
            'completed_breaks'       => $completedBreaks,
            'open_break_start'       => ($currentState === 'outside' && $isToday) ? $breakStart : null,
            'working_sessions'       => $workingSessions,
            'raw_punches'            => $timeline,
        ];
    }
}
