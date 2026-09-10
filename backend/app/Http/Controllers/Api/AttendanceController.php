<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AttendanceBreak;
use App\Models\BiometricEvent;
use App\Models\Team;
use App\Models\User;
use App\Http\Resources\AttendanceResource;
use App\Http\Resources\AttendanceBreakResource;
use App\Services\BiometricTimelineService;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AttendanceController extends Controller
{
    public function __construct(
        private readonly BiometricTimelineService $timeline
    ) {}

    // ──────────────────────────────────────────────────────────────────────────
    // Status widget (always own attendance)
    // ──────────────────────────────────────────────────────────────────────────

    public function status(Request $request)
    {
        $user  = $request->user();
        $today = Carbon::today('Asia/Kolkata')->toDateString();

        $wfhInfo             = $this->getWfhSessionInfo($user->id, $today);
        $hasApprovedWfhToday = $wfhInfo['has_approved_wfh'];
        $isWfhSessionActive  = $wfhInfo['is_wfh_session_active'];
        $wfhDurationType     = $wfhInfo['duration_type'];
        $wfhSessionMessage   = $wfhInfo['session_message'];

        $attendance = Attendance::with('breaks')
            ->where('user_id', $user->id)
            ->where('date', $today)
            ->first();

        // If WFH was cancelled or not approved, but attendance source was left as wfh_manual,
        // revert source to biometric so that physical office biometric processing resumes cleanly.
        if (!$hasApprovedWfhToday && $attendance && in_array($attendance->source, ['wfh_manual', 'manual'], true)) {
            $attendance->update(['source' => 'biometric']);
            $attendance->source = 'biometric';
        }

        // Auto-heal any WFH manual record where check_in_time was mistakenly stored as local IST instead of UTC
        $this->healSkewedAttendance($attendance, $today);

        // 1. Fetch raw biometric events for today to ensure real-time accuracy without waiting for cron
        $rawEvents = BiometricEvent::where('user_id', $user->id)
            ->whereDate('local_punch_time', $today)
            ->orderBy('local_punch_time', 'asc')
            ->get();

        // Check if there is a manual checkout timestamp
        $latestBioUtc = null;
        if ($rawEvents->isNotEmpty()) {
            $lastEvt = $rawEvents->last();
            $latestBioUtc = $lastEvt->utc_punch_time
                ? Carbon::parse($lastEvt->utc_punch_time)
                : Carbon::parse($lastEvt->local_punch_time, 'Asia/Kolkata')->setTimezone('UTC');
        }

        $hasManualCheckout = $attendance && $attendance->check_out_time && ($attendance->source === 'wfh_manual' || $hasApprovedWfhToday);
        $checkoutUtc = $hasManualCheckout ? Carbon::parse($attendance->getRawOriginal('check_out_time'), 'UTC') : null;

        // If manual checkout exists, only wipe it out if a physical biometric punch occurred AFTER the checkout
        $biometricIsNewerThanManualCheckout = !$hasManualCheckout || ($latestBioUtc && $checkoutUtc && $latestBioUtc->isAfter($checkoutUtc));

        // 2. If there are raw events, rebuild on the fly
        if ($rawEvents->isNotEmpty() && (!$attendance || $attendance->source === 'biometric' || $hasApprovedWfhToday)) {
            $previousDate         = Carbon::parse($today)->subDay()->format('Y-m-d');
            $hasOpenPreviousShift = Attendance::where('user_id', $user->id)
                ->where('date', $previousDate)
                ->where('source', 'biometric')
                ->whereNotNull('check_in_time')
                ->whereNull('check_out_time')
                ->exists();

            $build = $this->timeline->buildTimeline($rawEvents, $hasOpenPreviousShift);

            if ($build['ok'] && !empty($build['timeline']) && $build['timeline'][0]['type'] === 'in') {
                $interp = $this->timeline->interpretTimeline($build['timeline'], $today);

                if (!$attendance) {
                    $attendance = new Attendance();
                    $attendance->user_id = $user->id;
                    $attendance->date    = $today;
                    $attendance->source  = 'biometric';
                }

                // Preserve the morning biometric first_in punch!
                $attendance->check_in_time = $interp['first_in'];

                // Only overwrite check_out_time if no manual checkout or biometric punch occurred after checkout
                if ($biometricIsNewerThanManualCheckout) {
                    $attendance->check_out_time        = $interp['is_currently_working'] ? null : $interp['last_out'];
                    $attendance->last_out              = $interp['last_out'];
                    $attendance->total_working_minutes = $interp['total_working_minutes'];
                } else {
                    $attendance->last_out = $attendance->check_out_time;
                }
                $attendance->status = 'Present';

                // Construct in-memory breaks
                if ($biometricIsNewerThanManualCheckout) {
                    $breaksCollection = collect();
                    foreach ($interp['completed_breaks'] as $b) {
                        $breakObj = new AttendanceBreak();
                        $breakObj->break_start        = $b['start'];
                        $breakObj->break_end          = $b['end'];
                        $breakObj->total_break_minutes = $b['minutes'];
                        $breaksCollection->push($breakObj);
                    }
                    $attendance->setRelation('breaks', $breaksCollection);
                }
            }
        }

        if (!$attendance) {
            return response()->json([
                'status'                 => 'Not Checked In',
                'attendance'             => null,
                'has_approved_wfh_today' => $hasApprovedWfhToday,
                'is_wfh_session_active'  => $isWfhSessionActive,
                'wfh_duration_type'      => $wfhDurationType,
                'wfh_session_message'    => $wfhSessionMessage,
            ]);
        }

        if (!isset($attendance->last_out)) {
            if ($attendance->check_out_time) {
                $attendance->last_out = $attendance->check_out_time;
            } else {
                $lastOutEvt = BiometricEvent::where('user_id', $user->id)
                    ->whereDate('local_punch_time', $today)
                    ->where('direction', 'out')
                    ->orderBy('local_punch_time', 'desc')
                    ->first();
                if ($lastOutEvt) {
                    $attendance->last_out = $lastOutEvt->utc_punch_time ?? $lastOutEvt->local_punch_time;
                }
            }
        }

        $status = 'Checked In';
        if ($attendance->check_out_time) {
            $status = 'Checked Out';
        } else {
            $openBreak = collect($attendance->breaks)->first(fn($b) => is_null($b->break_end));
            if ($openBreak) {
                $status = 'On Break';
            }
        }

        $resource = new AttendanceResource($attendance);

        return response()->json([
            'status'                 => $status,
            'attendance'             => $resource,
            'last_out'               => $resource->toArray($request)['last_out'] ?? null,
            'has_approved_wfh_today' => $hasApprovedWfhToday,
            'is_wfh_session_active'  => $isWfhSessionActive,
            'wfh_duration_type'      => $wfhDurationType,
            'wfh_session_message'    => $wfhSessionMessage,
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Manual check-in / check-out / breaks  (always own attendance)
    // ──────────────────────────────────────────────────────────────────────────

    public function checkIn(Request $request)
    {
        $user  = $request->user();
        $today = Carbon::today('Asia/Kolkata')->toDateString();

        $wfhInfo = $this->getWfhSessionInfo($user->id, $today);
        if (!$wfhInfo['has_approved_wfh']) {
            return response()->json([
                'message' => 'Manual clock-in is only available for employees with an approved Work From Home (WFH) request today.'
            ], 403);
        }

        if (!$wfhInfo['is_wfh_session_active']) {
            return response()->json([
                'message' => $wfhInfo['session_message'] ?? 'WFH session is not currently active.'
            ], 403);
        }

        $existing = Attendance::where('user_id', $user->id)->where('date', $today)->first();
        $now = now();
        $source = 'wfh_manual';

        // If employee already clocked in today (either via morning biometric or earlier manual punch):
        if ($existing && $existing->check_in_time) {
            // If already currently working (checked in, not checked out)
            if (is_null($existing->check_out_time)) {
                return response()->json(['message' => 'Already checked in and currently working'], 400);
            }

            // Employee was previously clocked out and is now clocking back IN for WFH (break ends, resume work)
            $previousOut = Carbon::parse($existing->check_out_time);
            $breakMinutes = max(0, (int) round($previousOut->diffInMinutes($now)));

            try {
                AttendanceBreak::create([
                    'attendance_id'       => $existing->id,
                    'break_start'         => $previousOut,
                    'break_end'           => $now,
                    'total_break_minutes' => $breakMinutes,
                    'break_type'          => 'Standard',
                    'source'              => $source,
                ]);
            } catch (\Throwable $e) {
                AttendanceBreak::create([
                    'attendance_id'       => $existing->id,
                    'break_start'         => $previousOut,
                    'break_end'           => $now,
                    'total_break_minutes' => $breakMinutes,
                    'break_type'          => 'Standard',
                ]);
            }

            // Re-open attendance: employee is working again, stored check_out_time must be NULL
            // The morning biometric check_in_time is PRESERVED!
            $existing->update([
                'check_out_time' => null,
                'status'         => 'Present',
                'source'         => $source,
            ]);

            return response()->json([
                'message' => 'Clocked in successfully (resumed working for WFH shift)',
                'data'    => new AttendanceResource($existing->fresh(['breaks'])),
            ]);
        }

        try {
            if ($existing) {
                $existing->update([
                    'check_in_time' => $now,
                    'status'        => 'Present',
                    'source'        => $source,
                ]);
                $attendance = $existing;
            } else {
                $attendance = Attendance::create([
                    'user_id'        => $user->id,
                    'date'           => $today,
                    'check_in_time'  => $now,
                    'status'         => 'Present',
                    'source'         => $source,
                ]);
            }
        } catch (\Throwable $e) {
            // If DB column is still enum('manual', 'biometric') prior to migration, fallback to 'manual'
            if (str_contains($e->getMessage(), 'source') || str_contains($e->getMessage(), '1265')) {
                $source = 'manual';
                if ($existing) {
                    $existing->update([
                        'check_in_time' => $now,
                        'status'        => 'Present',
                        'source'        => $source,
                    ]);
                    $attendance = $existing;
                } else {
                    $attendance = Attendance::create([
                        'user_id'        => $user->id,
                        'date'           => $today,
                        'check_in_time'  => $now,
                        'status'         => 'Present',
                        'source'         => $source,
                    ]);
                }
            } else {
                throw $e;
            }
        }

        return response()->json([
            'message' => 'Checked in successfully (WFH)',
            'data'    => new AttendanceResource($attendance),
        ], 201);
    }

    public function checkOut(Request $request)
    {
        $user  = $request->user();
        $today = Carbon::today('Asia/Kolkata')->toDateString();

        $wfhInfo = $this->getWfhSessionInfo($user->id, $today);
        if (!$wfhInfo['has_approved_wfh']) {
            return response()->json([
                'message' => 'Manual clock-out is only available for employees with an approved Work From Home (WFH) request today.'
            ], 403);
        }

        if (!$wfhInfo['is_wfh_session_active']) {
            return response()->json([
                'message' => $wfhInfo['session_message'] ?? 'WFH session is not currently active.'
            ], 403);
        }

        $attendance = Attendance::where('user_id', $user->id)->where('date', $today)->first();
        if (!$attendance || !$attendance->check_in_time) {
            return response()->json(['message' => 'Not checked in today'], 400);
        }
        if ($attendance->check_out_time) {
            return response()->json(['message' => 'Already checked out'], 400);
        }

        $openBreak = $attendance->breaks()->whereNull('break_end')->first();
        if ($openBreak) {
            return response()->json(['message' => 'Please end your break before checking out'], 400);
        }

        $now               = now();
        $checkInTime       = Carbon::parse($attendance->check_in_time);
        $elapsedMinutes    = $checkInTime->diffInMinutes($now);
        $totalBreakMinutes = $attendance->breaks()->sum('total_break_minutes') ?? 0;
        $workingMinutes    = max(0, $elapsedMinutes - $totalBreakMinutes);

        $attendance->update([
            'check_out_time'        => $now,
            'total_working_minutes' => (int) round($workingMinutes),
            'source'                => 'wfh_manual',
        ]);
        $attendance->last_out = $now;

        return response()->json([
            'message' => 'Checked out successfully (WFH)',
            'data'    => new AttendanceResource($attendance),
        ]);
    }

    public function startBreak(Request $request)
    {
        $user  = $request->user();
        $today = Carbon::today('Asia/Kolkata')->toDateString();

        $attendance = Attendance::where('user_id', $user->id)->where('date', $today)->first();
        if (!$attendance || $attendance->check_out_time) {
            return response()->json(['message' => 'Must be checked in to start a break'], 400);
        }

        $openBreak = $attendance->breaks()->whereNull('break_end')->first();
        if ($openBreak) {
            return response()->json(['message' => 'Already on a break'], 400);
        }

        $break = AttendanceBreak::create([
            'attendance_id' => $attendance->id,
            'break_start'   => now(),
            'break_type'    => 'Standard',
        ]);

        return response()->json(['message' => 'Break started', 'data' => $break], 201);
    }

    public function endBreak(Request $request)
    {
        $user  = $request->user();
        $today = Carbon::today('Asia/Kolkata')->toDateString();

        $attendance = Attendance::where('user_id', $user->id)->where('date', $today)->first();
        if (!$attendance) {
            return response()->json(['message' => 'Not checked in'], 400);
        }

        $openBreak = $attendance->breaks()->whereNull('break_end')->first();
        if (!$openBreak) {
            return response()->json(['message' => 'Not currently on a break'], 400);
        }

        $now         = now();
        $breakStart  = Carbon::parse($openBreak->break_start);
        $breakMinutes = $breakStart->diffInMinutes($now);

        $openBreak->update([
            'break_end'           => $now,
            'total_break_minutes' => (int) round($breakMinutes),
        ]);

        return response()->json(['message' => 'Break ended', 'data' => $openBreak]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Attendance history list (scoped by role)
    // ──────────────────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $user  = $request->user();
        $query = Attendance::with(['breaks', 'user']);

        if ($user->hasRole('Employee')) {
            // Own records only
            $query->where('user_id', $user->id);

        } elseif ($user->hasRole('Team Lead')) {
            // Own records + records of employees in teams they actually lead
            $ledTeamMemberIds = Team::where('team_lead_id', $user->id)
                ->with('members')
                ->get()
                ->flatMap(fn($team) => $team->members->pluck('id'))
                ->unique()
                ->values()
                ->toArray();

            $query->whereIn('user_id', array_merge([$user->id], $ledTeamMemberIds));

        }
        // HR / Admin / Super Admin: no additional scope – see all records

        $isMonthView = false;
        if ($request->has('month') && $request->month) {
            try {
                $month = Carbon::parse($request->month);
                $query->whereYear('date', $month->year)
                      ->whereMonth('date', $month->month);
                $isMonthView = true;
            } catch (\Exception $e) {
                // Ignore invalid date strings
            }
        }

        // For month view, return all records without pagination
        // For general attendance list, paginate with 15 per page
        if ($isMonthView) {
            return AttendanceResource::collection(
                $query->orderBy('date', 'desc')->get()
            );
        }

        return AttendanceResource::collection(
            $query->orderBy('date', 'desc')->paginate(15)
        );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Attendance Details: per-day canonical timeline (authorized)
    // ──────────────────────────────────────────────────────────────────────────

    public function details(Request $request)
    {
        $request->validate([
            'date'    => ['required', 'date_format:Y-m-d'],
            'user_id' => ['sometimes', 'integer', 'exists:users,id'],
        ]);

        $authUser  = $request->user();
        $targetId  = $request->input('user_id', $authUser->id);
        $dateString = $request->input('date');

        // ── Authorization ───────────────────────────────────────────────────
        if ((int) $targetId !== $authUser->id) {
            if ($authUser->hasRole('Employee')) {
                abort(403, 'Employees may only view their own attendance details.');
            }

            if ($authUser->hasRole('Team Lead')) {
                // Only allow if target is a member of a team led by this user
                $isTeamMember = Team::where('team_lead_id', $authUser->id)
                    ->with('members')
                    ->get()
                    ->flatMap(fn($team) => $team->members->pluck('id'))
                    ->contains($targetId);

                if (!$isTeamMember) {
                    abort(403, 'Team Leads may only view attendance of their own team members.');
                }
            }
            // HR / Admin / Super Admin: allowed
        }

        // ── Fetch attendance record ─────────────────────────────────────────
        $attendance = Attendance::with(['breaks', 'user'])
            ->where('user_id', $targetId)
            ->where('date', $dateString)
            ->first();

        $this->healSkewedAttendance($attendance, $dateString);

        // ── Fetch raw biometric events ──────────────────────────────────────
        $rawEvents = BiometricEvent::where('user_id', $targetId)
            ->whereDate('local_punch_time', $dateString)
            ->orderBy('local_punch_time', 'asc')
            ->get();

        $targetUser = User::find($targetId);

        if ($rawEvents->isEmpty() && !$attendance) {
            return response()->json([
                'date'     => $dateString,
                'message'  => 'No biometric or attendance data found for this date.',
                'employee' => $targetUser ? [
                    'id'                 => $targetUser->id,
                    'first_name'         => $targetUser->first_name,
                    'last_name'          => $targetUser->last_name,
                    'employee_code'      => $targetUser->employee_code,
                    'designation'        => $targetUser->designation,
                    'profile_photo_path' => $targetUser->profilePhotoUrl(),
                ] : null,
                'data'     => null,
            ]);
        }

        // ── Previous-day open shift check ───────────────────────────────────
        $previousDate         = Carbon::parse($dateString)->subDay()->format('Y-m-d');
        $hasOpenPreviousShift = Attendance::where('user_id', $targetId)
            ->where('date', $previousDate)
            ->where('source', 'biometric')
            ->whereNotNull('check_in_time')
            ->whereNull('check_out_time')
            ->exists();

        // ── Build & interpret using canonical service ────────────────────────
        $build = $this->timeline->buildTimeline($rawEvents, $hasOpenPreviousShift);

        if (!$build['ok']) {
            return response()->json([
                'date'             => $dateString,
                'error'            => $build['error'],
                'cross_midnight'   => $build['cross_midnight'],
                'data'             => null,
            ]);
        }

        $interp = $this->timeline->interpretTimeline($build['timeline'], $dateString);

        // ── Convert UTC times to Asia/Kolkata for JSON serialization ────────
        // BiometricTimelineService now uses utc_punch_time (correct UTC times)
        // instead of local_punch_time. Convert to IST for display.
        $shiftCarbon = fn($c) => $c ? $c->setTimezone('Asia/Kolkata')->toIso8601String() : null;

        $shiftedRawPunches = array_map(fn($p) => [
            'type'     => $p['type'],
            'time'     => $shiftCarbon($p['time']),
            'event_id' => $p['event_id'],
        ], $interp['raw_punches']);

        $shiftedSessions = array_map(fn($s) => [
            'start'   => $shiftCarbon($s['start']),
            'end'     => $shiftCarbon($s['end']),
            'minutes' => $s['minutes'],
        ], $interp['working_sessions']);

        $shiftedBreaks = array_map(fn($b) => [
            'start'   => $shiftCarbon($b['start']),
            'end'     => $shiftCarbon($b['end']),
            'minutes' => $b['minutes'],
        ], $interp['completed_breaks']);

        // Include open break from DB (biometric open break = current break_end IS NULL)
        $openBreakRow = $attendance?->breaks()->whereNull('break_end')->first();

        // ── Build status label ───────────────────────────────────────────────
        $statusLabel = 'No Activity';
        if ($interp['is_currently_working']) {
            $statusLabel = 'Checked In';
        } elseif ($interp['has_missing_punch_out']) {
            $statusLabel = 'Missing Punch Out / Requires Review';
        } elseif ($interp['first_in'] && $interp['last_out']) {
            $statusLabel = 'Complete';
        } elseif ($interp['first_in']) {
            $statusLabel = 'Open Shift';
        } elseif ($attendance && $attendance->check_in_time) {
            $isWorking = is_null($attendance->check_out_time);
            if ($isWorking) {
                $statusLabel = 'Checked In (WFH)';
            } else {
                $statusLabel = Carbon::parse($dateString)->isToday() ? 'Stepped Out / On Break' : 'Complete (WFH)';
            }
        }

        $firstInOutput = $shiftCarbon($interp['first_in']) ?: ($attendance?->check_in_time ? Carbon::parse($attendance->check_in_time)->setTimezone('Asia/Kolkata')->toIso8601String() : null);
        $lastOutOutput = $shiftCarbon($interp['last_out']) ?: ($attendance?->check_out_time ? Carbon::parse($attendance->check_out_time)->setTimezone('Asia/Kolkata')->toIso8601String() : null);

        $isManualAttendance = in_array($attendance?->source, ['manual', 'wfh_manual'], true) || (empty($shiftedRawPunches) && (bool)$firstInOutput);

        $sessionsOutput   = $shiftedSessions;
        $rawPunchesOutput = $shiftedRawPunches;
        $breaksOutput     = $shiftedBreaks;
        $openBreakOutput  = $openBreakRow ? $shiftCarbon(Carbon::parse($openBreakRow->break_start)) : null;

        if (empty($shiftedRawPunches) && $attendance && $firstInOutput) {
            $manualData       = $this->buildManualTimeline($attendance, Carbon::parse($dateString)->isToday());
            $sessionsOutput   = $manualData['working_sessions'];
            $rawPunchesOutput = $manualData['raw_punches'];
            $breaksOutput     = $manualData['completed_breaks'];
            $openBreakOutput  = $manualData['open_break_start'] ?? $openBreakOutput;
        }

        $isCurrentlyWorking = $interp['is_currently_working'] ?: ($attendance && $attendance->check_in_time && is_null($attendance->check_out_time));

        return response()->json([
            'date'                   => $dateString,
            'employee'               => $targetUser ? [
                'id'                 => $targetUser->id,
                'first_name'         => $targetUser->first_name,
                'last_name'          => $targetUser->last_name,
                'employee_code'      => $targetUser->employee_code,
                'designation'        => $targetUser->designation,
                'profile_photo_path' => $targetUser->profilePhotoUrl(),
            ] : null,
            'attendance_id'          => $attendance?->id,
            'status_label'           => $statusLabel,
            'first_in'               => $firstInOutput,
            'last_out'               => $lastOutOutput,
            'current_sequence_state' => $interp['current_sequence_state'] ?: ($isCurrentlyWorking ? 'in' : 'out'),
            'is_currently_working'   => $isCurrentlyWorking,
            'has_missing_punch_out'  => $interp['has_missing_punch_out'],
            'requires_review'        => $interp['requires_review'],
            'total_working_minutes'  => $interp['total_working_minutes'] ?? $attendance?->total_working_minutes,
            'total_completed_break_minutes' => array_sum(
                array_column($breaksOutput, 'minutes')
            ),
            'open_break_start'       => $openBreakOutput,
            'working_sessions'       => $sessionsOutput,
            'completed_breaks'       => $breaksOutput,
            'raw_punches'            => $rawPunchesOutput,
            'orphan_event_ids'       => $build['orphan_event_ids'],
            'is_manual'              => $isManualAttendance,
            'source'                 => $attendance?->source ?? ($rawEvents->isNotEmpty() ? 'biometric' : 'manual'),
        ]);
    }

    /**
     * Determine WFH approval and active session window for a user on a given date.
     * Respects Full Day, Half-Morning (WFH active until 14:00 IST), and Half-Afternoon (WFH active from 14:30 IST).
     * Returns false for all fields if WFH was cancelled by employee or admin.
     */
    private function getWfhSessionInfo(int $userId, string $dateString): array
    {
        $wfhRequest = \App\Models\WfhRequest::where('user_id', $userId)
            ->where('status', 'Approved')
            ->whereDate('start_date', '<=', $dateString)
            ->whereDate('end_date', '>=', $dateString)
            ->first();

        if (!$wfhRequest) {
            return [
                'has_approved_wfh'      => false,
                'is_wfh_session_active' => false,
                'duration_type'          => null,
                'session_message'        => null,
                'wfh_request_id'         => null,
            ];
        }

        $durationType = $wfhRequest->duration_type ?? 'Full';
        $nowIst       = Carbon::now('Asia/Kolkata');
        $nowMinutes   = $nowIst->hour * 60 + $nowIst->minute;

        // Half-Afternoon WFH window starts at 14:30 IST (02:30 PM)
        $afternoonStartMinutes = 14 * 60 + 30;
        // Half-Morning WFH window ends at 14:00 IST (02:00 PM)
        $morningEndMinutes     = 14 * 60;

        $isActive = true;
        $message  = null;

        if ($durationType === 'Half-Afternoon') {
            if ($nowMinutes < $afternoonStartMinutes) {
                $isActive = false;
                $message  = 'Afternoon WFH session starts at 02:30 PM. Morning office session is active via biometric device.';
            } else {
                $isActive = true;
                $message  = 'Afternoon WFH session is active (since 02:30 PM). Manual punch entries enabled.';
            }
        } elseif ($durationType === 'Half-Morning') {
            if ($nowMinutes >= $morningEndMinutes) {
                $isActive = false;
                $message  = 'Morning WFH session ended at 02:00 PM. Afternoon office session is active via biometric device.';
            } else {
                $isActive = true;
                $message  = 'Morning WFH session is active. Manual punch entries enabled.';
            }
        } else {
            // Full Day WFH
            $isActive = true;
            $message  = 'Full Day WFH Approved. Manual punch entries enabled.';
        }

        return [
            'has_approved_wfh'      => true,
            'is_wfh_session_active' => $isActive,
            'duration_type'          => $durationType,
            'session_message'        => $message,
            'wfh_request_id'         => $wfhRequest->id,
        ];
    }

    /**
     * Auto-heal any WFH / manual attendance record where check_in_time was mistakenly stored as local IST instead of UTC.
     * In UTC, a check-in timestamp saved directly as IST will be ~5.5 hours ahead of true UTC time.
     * If check_in_time is in the future relative to UTC now (or on 2026-09-07 raw hour >= 10 UTC):
     */
    private function healSkewedAttendance(?Attendance $attendance, string $dateString): void
    {
        if (!$attendance || !$attendance->check_in_time) {
            return;
        }

        $rawCheckInStr = $attendance->getRawOriginal('check_in_time');
        if (!$rawCheckInStr) {
            return;
        }

        $rawCheckIn = Carbon::parse($rawCheckInStr, 'UTC');
        $nowUtc = now();

        $isSkewed = $rawCheckIn->isAfter($nowUtc->copy()->addMinutes(5))
            || ($dateString === '2026-09-07' && in_array($attendance->source, ['manual', 'wfh_manual'], true) && $rawCheckIn->hour >= 10);

        if ($isSkewed) {
            $fixedCheckIn = $rawCheckIn->copy()->subMinutes(330);
            $attendance->check_in_time = $fixedCheckIn;

            $fixedCheckOut = null;
            if ($attendance->check_out_time) {
                $rawCheckOutStr = $attendance->getRawOriginal('check_out_time');
                if ($rawCheckOutStr) {
                    $rawCheckOut = Carbon::parse($rawCheckOutStr, 'UTC');
                    if ($rawCheckOut->isAfter($nowUtc->copy()->addMinutes(5)) || ($dateString === '2026-09-07' && $rawCheckOut->hour >= 10)) {
                        $fixedCheckOut = $rawCheckOut->copy()->subMinutes(330);
                        $attendance->check_out_time = $fixedCheckOut;
                    }
                }
            }

            $updateData = [
                'check_in_time' => $fixedCheckIn->format('Y-m-d H:i:s'),
                'updated_at'    => $nowUtc->format('Y-m-d H:i:s'),
            ];
            if ($fixedCheckOut) {
                $updateData['check_out_time'] = $fixedCheckOut->format('Y-m-d H:i:s');
            }

            \Illuminate\Support\Facades\DB::table('attendances')
                ->where('id', $attendance->id)
                ->update($updateData);
        }
    }

    /**
     * Build chronological punch and session timeline for manual / WFH attendance records
     * using First IN, breaks between subsequent punches, and Last OUT.
     */
    private function buildManualTimeline(Attendance $attendance, bool $isToday): array
    {
        $shiftCarbon = fn($c) => $c ? Carbon::parse($c)->setTimezone('Asia/Kolkata')->toIso8601String() : null;

        $rawPunches      = [];
        $workingSessions = [];
        $completedBreaks = [];

        $firstIn = Carbon::parse($attendance->check_in_time);
        $rawPunches[] = [
            'type'      => 'in',
            'time'      => $shiftCarbon($firstIn),
            'event_id'  => 'manual_in_1',
            'is_manual' => true,
            'source'    => $attendance->source,
            'label'     => 'WFH Clock In',
        ];

        $currentSessionStart = $firstIn;

        // Fetch completed breaks ordered by break_start
        $breaks = $attendance->breaks()->whereNotNull('break_end')->orderBy('break_start', 'asc')->get();

        $punchIndex = 2;
        foreach ($breaks as $b) {
            $bStart = Carbon::parse($b->break_start);
            $bEnd   = Carbon::parse($b->break_end);

            // Working session ended at break start
            $sessionMins = max(0, (int) floor($currentSessionStart->diffInSeconds($bStart) / 60));
            $workingSessions[] = [
                'start'     => $shiftCarbon($currentSessionStart),
                'end'       => $shiftCarbon($bStart),
                'minutes'   => $sessionMins,
                'is_manual' => true,
            ];

            // OUT punch
            $rawPunches[] = [
                'type'      => 'out',
                'time'      => $shiftCarbon($bStart),
                'event_id'  => 'manual_out_' . $punchIndex++,
                'is_manual' => true,
                'source'    => $attendance->source,
                'label'     => 'WFH Clock Out',
            ];

            // Completed break
            $completedBreaks[] = [
                'start'   => $shiftCarbon($bStart),
                'end'     => $shiftCarbon($bEnd),
                'minutes' => (int) ($b->total_break_minutes ?? floor($bStart->diffInSeconds($bEnd) / 60)),
            ];

            // Resumed IN punch
            $rawPunches[] = [
                'type'      => 'in',
                'time'      => $shiftCarbon($bEnd),
                'event_id'  => 'manual_in_' . $punchIndex++,
                'is_manual' => true,
                'source'    => $attendance->source,
                'label'     => 'WFH Clock In',
            ];

            $currentSessionStart = $bEnd;
        }

        // Final session / exit
        if ($attendance->check_out_time) {
            $finalOut = Carbon::parse($attendance->check_out_time);
            $sessionMins = max(0, (int) floor($currentSessionStart->diffInSeconds($finalOut) / 60));
            $workingSessions[] = [
                'start'     => $shiftCarbon($currentSessionStart),
                'end'       => $shiftCarbon($finalOut),
                'minutes'   => $sessionMins,
                'is_manual' => true,
            ];
            $rawPunches[] = [
                'type'      => 'out',
                'time'      => $shiftCarbon($finalOut),
                'event_id'  => 'manual_out_' . $punchIndex++,
                'is_manual' => true,
                'source'    => $attendance->source,
                'label'     => 'WFH Clock Out',
            ];
            $openBreakStart = $isToday ? $shiftCarbon($finalOut) : null;
        } else {
            // Currently working (open session)
            $workingSessions[] = [
                'start'     => $shiftCarbon($currentSessionStart),
                'end'       => null,
                'minutes'   => null,
                'is_manual' => true,
            ];
            $openBreakStart = null;
        }

        return [
            'raw_punches'      => $rawPunches,
            'working_sessions' => $workingSessions,
            'completed_breaks' => $completedBreaks,
            'open_break_start' => $openBreakStart,
        ];
    }
}
