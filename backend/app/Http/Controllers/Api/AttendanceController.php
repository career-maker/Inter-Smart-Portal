<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AttendanceBreak;
use App\Http\Resources\AttendanceResource;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AttendanceController extends Controller
{
    /**
     * Get the current status for the UI widget.
     * Possible states: Not Checked In, Checked In, On Break, Checked Out
     */
    public function status(Request $request)
    {
        $today = Carbon::today()->toDateString();
        $attendance = Attendance::with('breaks')
            ->where('user_id', $request->user()->id)
            ->where('date', $today)
            ->first();

        if (!$attendance) {
            return response()->json(['status' => 'Not Checked In', 'attendance' => null]);
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
            'status' => $status,
            'attendance' => new AttendanceResource($attendance)
        ]);
    }

    public function checkIn(Request $request)
    {
        $user = $request->user();
        $today = Carbon::today()->toDateString();

        $existing = Attendance::where('user_id', $user->id)->where('date', $today)->first();
        if ($existing) {
            return response()->json(['message' => 'Already checked in today'], 400);
        }

        $attendance = Attendance::create([
            'user_id' => $user->id,
            'date' => $today,
            'check_in_time' => now(),
            'status' => 'Present' // Simplification for Phase 7
        ]);

        return response()->json([
            'message' => 'Checked in successfully',
            'data' => new AttendanceResource($attendance)
        ], 201);
    }

    public function checkOut(Request $request)
    {
        $user = $request->user();
        $today = Carbon::today()->toDateString();

        $attendance = Attendance::where('user_id', $user->id)->where('date', $today)->first();
        
        if (!$attendance) {
            return response()->json(['message' => 'Not checked in today'], 400);
        }
        if ($attendance->check_out_time) {
            return response()->json(['message' => 'Already checked out'], 400);
        }

        // Ensure no open breaks
        $openBreak = $attendance->breaks()->whereNull('break_end')->first();
        if ($openBreak) {
            return response()->json(['message' => 'Please end your break before checking out'], 400);
        }

        $now = now();
        $checkInTime = Carbon::parse($attendance->check_in_time);
        
        // Calculate total elapsed minutes
        $elapsedMinutes = $checkInTime->diffInMinutes($now);
        
        // Sum total break minutes
        $totalBreakMinutes = $attendance->breaks()->sum('total_break_minutes');
        
        $workingMinutes = max(0, $elapsedMinutes - $totalBreakMinutes);

        $attendance->update([
            'check_out_time' => $now,
            'total_working_minutes' => (int) round($workingMinutes)
        ]);

        return response()->json([
            'message' => 'Checked out successfully',
            'data' => new AttendanceResource($attendance)
        ]);
    }

    public function startBreak(Request $request)
    {
        $user = $request->user();
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
            'break_start' => now(),
            'break_type' => 'Standard'
        ]);

        return response()->json([
            'message' => 'Break started',
            'data' => $break
        ], 201);
    }

    public function endBreak(Request $request)
    {
        $user = $request->user();
        $today = Carbon::today()->toDateString();

        $attendance = Attendance::where('user_id', $user->id)->where('date', $today)->first();
        
        if (!$attendance) {
            return response()->json(['message' => 'Not checked in'], 400);
        }

        $openBreak = $attendance->breaks()->whereNull('break_end')->first();
        if (!$openBreak) {
            return response()->json(['message' => 'Not currently on a break'], 400);
        }

        $now = now();
        $breakStart = Carbon::parse($openBreak->break_start);
        $breakMinutes = $breakStart->diffInMinutes($now);

        $openBreak->update([
            'break_end' => $now,
            'total_break_minutes' => (int) round($breakMinutes)
        ]);

        return response()->json([
            'message' => 'Break ended',
            'data' => $openBreak
        ]);
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $query = Attendance::with('breaks');

        // Employees see own. Admins/HR see all. (Simplification: Team Leads see all for now or just own, depending on reqs. We'll do Employee vs Admin/HR/Lead).
        if ($user->hasRole('Employee')) {
            $query->where('user_id', $user->id);
        } else {
            $query->with('user');
        }

        if ($request->has('month') && $request->month) {
            try {
                $month = Carbon::parse($request->month);
                $query->whereYear('date', $month->year)
                      ->whereMonth('date', $month->month);
            } catch (\Exception $e) {
                // Ignore invalid date strings
            }
        }

        return AttendanceResource::collection($query->orderBy('date', 'desc')->paginate(15));
    }
}
