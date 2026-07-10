<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AttendanceBreak;
use App\Models\BiometricEvent;
use App\Models\Team;
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
        $today      = Carbon::today()->toDateString();
        $attendance = Attendance::with('breaks')
            ->where('user_id', $request->user()->id)
            ->where('date', $today)
            ->first();

        if (!$attendance) {
            return response()->json(['status' => 'Not Checked In', 'attendance' => null]);
        }

        // Sync missing check_out_time from biometric events if not already set
        if (!$attendance->check_out_time) {
            $latestPunchOut = BiometricEvent::where('user_id', $request->user()->id)
                ->whereDate('local_punch_time', $today)
                ->where('direction', 'out')
                ->where('mapping_status', 'mapped')
                ->orderBy('local_punch_time', 'desc')
                ->first(['local_punch_time']);

            if ($latestPunchOut && $latestPunchOut->local_punch_time) {
                // local_punch_time is in Asia/Kolkata; convert to UTC for storage
                $localTime = Carbon::parse($latestPunchOut->local_punch_time, 'Asia/Kolkata');
                $utcTime = $localTime->setTimezone('UTC');
                $attendance->check_out_time = $utcTime;
                $attendance->save();
                \Log::info('Synced punch_out_time from biometric event', [
                    'user_id' => $request->user()->id,
                    'date' => $today,
                    'local_punch_time' => $latestPunchOut->local_punch_time,
                    'utc_punch_time' => $utcTime,
                ]);
            }
        }

        // Also check if we need to update from biometric even if check_out_time exists
        // (in case the biometric has a later time)
        if ($attendance->check_out_time && $attendance->source !== 'biometric') {
            $latestBiometricPunch = BiometricEvent::where('user_id', $request->user()->id)
                ->whereDate('local_punch_time', $today)
                ->where('direction', 'out')
                ->where('mapping_status', 'mapped')
                ->orderBy('local_punch_time', 'desc')
                ->first(['local_punch_time']);

            if ($latestBiometricPunch && $latestBiometricPunch->local_punch_time) {
                // Convert both to UTC for comparison
                $biometricLocal = Carbon::parse($latestBiometricPunch->local_punch_time, 'Asia/Kolkata');
                $biometricUtc = $biometricLocal->setTimezone('UTC');
                $attendanceTime = Carbon::parse($attendance->check_out_time)->setTimezone('UTC');

                // Compare: if biometric time is later, update
                if ($biometricUtc->greaterThan($attendanceTime)) {
                    $attendance->check_out_time = $biometricUtc;
                    $attendance->source = 'biometric';
                    $attendance->save();
                    \Log::info('Updated punch_out_time to later biometric punch', [
                        'user_id' => $request->user()->id,
                        'old_time_utc' => $attendanceTime,
                        'new_time_utc' => $biometricUtc,
                        'biometric_local_time' => $latestBiometricPunch->local_punch_time,
                    ]);
                }
            }
        }

        $status = 'Checked In';
        if ($attendance->check_out_time) {
            $status = 'Checked Out';
        } else {
            $openBreak = $attendance->breaks()->whereNull('break_end')->first();
            if ($openBreak) {
                $status = 'On Break';
            }
        }

        return response()->json([
            'status'     => $status,
            'attendance' => new AttendanceResource($attendance),
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Manual check-in / check-out / breaks  (always own attendance)
    // ──────────────────────────────────────────────────────────────────────────

    public function checkIn(Request $request)
    {
        $user  = $request->user();
        $today = Carbon::today()->toDateString();

        $existing = Attendance::where('user_id', $user->id)->where('date', $today)->first();
        if ($existing) {
            return response()->json(['message' => 'Already checked in today'], 400);
        }

        $attendance = Attendance::create([
            'user_id'        => $user->id,
            'date'           => $today,
            'check_in_time'  => now(),
            'status'         => 'Present',
        ]);

        return response()->json([
            'message' => 'Checked in successfully',
            'data'    => new AttendanceResource($attendance),
        ], 201);
    }

    public function checkOut(Request $request)
    {
        $user  = $request->user();
        $today = Carbon::today()->toDateString();

        $attendance = Attendance::where('user_id', $user->id)->where('date', $today)->first();
        if (!$attendance) {
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
        $totalBreakMinutes = $attendance->breaks()->sum('total_break_minutes');
        $workingMinutes    = max(0, $elapsedMinutes - $totalBreakMinutes);

        $attendance->update([
            'check_out_time'        => $now,
            'total_working_minutes' => (int) round($workingMinutes),
        ]);

        return response()->json([
            'message' => 'Checked out successfully',
            'data'    => new AttendanceResource($attendance),
        ]);
    }

    public function startBreak(Request $request)
    {
        $user  = $request->user();
        $today = Carbon::today()->toDateString();

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
        $today = Carbon::today()->toDateString();

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

        if ($request->has('month') && $request->month) {
            try {
                $month = Carbon::parse($request->month);
                $query->whereYear('date', $month->year)
                      ->whereMonth('date', $month->month);
            } catch (\Exception $e) {
                // Ignore invalid date strings
            }
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

        // ── Fetch raw biometric events ──────────────────────────────────────
        $rawEvents = BiometricEvent::where('user_id', $targetId)
            ->whereDate('local_punch_time', $dateString)
            ->orderBy('local_punch_time', 'asc')
            ->get();

        if ($rawEvents->isEmpty() && !$attendance) {
            return response()->json([
                'date'    => $dateString,
                'message' => 'No biometric or attendance data found for this date.',
                'data'    => null,
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

        // ── Shift Carbon values to Kolkata offset for JSON serialization ─────
        // Note: BiometricTimelineService receives local_punch_time which is stored as timestamp
        // but misinterpreted by Eloquent as UTC. shiftTimezone() corrects this interpretation.
        $shiftCarbon = fn($c) => $c ? $c->shiftTimezone('Asia/Kolkata')->toIso8601String() : null;

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
        }

        return response()->json([
            'date'                   => $dateString,
            'employee'               => $attendance?->user ? [
                'id'         => $attendance->user->id,
                'first_name' => $attendance->user->first_name,
                'last_name'  => $attendance->user->last_name,
            ] : null,
            'attendance_id'          => $attendance?->id,
            'status_label'           => $statusLabel,
            'first_in'               => $shiftCarbon($interp['first_in']),
            'last_out'               => $shiftCarbon($interp['last_out']),
            'current_sequence_state' => $interp['current_sequence_state'],
            'is_currently_working'   => $interp['is_currently_working'],
            'has_missing_punch_out'  => $interp['has_missing_punch_out'],
            'requires_review'        => $interp['requires_review'],
            'total_working_minutes'  => $interp['total_working_minutes'],
            'total_completed_break_minutes' => array_sum(
                array_column($interp['completed_breaks'], 'minutes')
            ),
            'open_break_start'       => $openBreakRow
                ? $shiftCarbon(Carbon::parse($openBreakRow->break_start))
                : null,
            'working_sessions'       => $shiftedSessions,
            'completed_breaks'       => $shiftedBreaks,
            'raw_punches'            => $shiftedRawPunches,
            'orphan_event_ids'       => $build['orphan_event_ids'],
        ]);
    }
}
