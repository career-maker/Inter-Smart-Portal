<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Serializes Attendance records.
 *
 * Timezone strategy
 * ─────────────────
 * attendances.check_in_time  is a `timestamp without time zone` column storing
 * local Asia/Kolkata wall-clock times. Laravel's app timezone is UTC, so Eloquent
 * attaches a UTC Carbon instance. We use shiftTimezone('Asia/Kolkata') to correct
 * the offset *without changing the hour digits*, producing an unambiguous ISO-8601
 * string (e.g. "2026-07-07T10:33:16+05:30") that the browser parses correctly.
 *
 * Consumers (all read through this single resource):
 *   GET  /api/attendance          → index (history list)
 *   GET  /api/attendance/status   → status widget
 *   POST /api/attendance/check-in
 *   POST /api/attendance/check-out
 *   GET  /api/dashboard/kpis      → attendance widget
 */
class AttendanceResource extends JsonResource
{
    private function shiftLocal(?object $carbonOrNull): ?string
    {
        if ($carbonOrNull === null) {
            return null;
        }
        return $carbonOrNull->shiftTimezone('Asia/Kolkata')->toIso8601String();
    }

    public function toArray(Request $request): array
    {
        return [
            'id'                    => $this->id,
            'date'                  => $this->date?->format('Y-m-d'),
            'check_in_time'         => $this->shiftLocal($this->check_in_time),
            'check_out_time'        => $this->shiftLocal($this->check_out_time),
            'total_working_minutes' => $this->total_working_minutes,
            'status'                => $this->status,
            'source'                => $this->source,
            'user'                  => $this->whenLoaded('user', fn() => [
                'id'         => $this->user->id,
                'first_name' => $this->user->first_name,
                'last_name'  => $this->user->last_name,
            ]),
            'breaks' => AttendanceBreakResource::collection(
                $this->whenLoaded('breaks', fn() => $this->breaks)
            ),
        ];
    }
}
