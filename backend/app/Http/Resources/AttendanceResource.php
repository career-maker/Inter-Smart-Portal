<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Serializes Attendance records.
 *
 * Timezone strategy
 * ─────────────────
 * attendances.check_in_time is stored as UTC in the database.
 * App timezone is set to Asia/Kolkata, so Eloquent reads UTC times and converts
 * them to Asia/Kolkata Carbon objects automatically.
 *
 * We ensure the carbon is properly set to Asia/Kolkata and return an ISO string
 * with the correct +05:30 offset (e.g. "2026-07-07T10:33:16+05:30")
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
    private function formatTimeAsIso($timeValue): ?string
    {
        if (!$timeValue) {
            return null;
        }

        // Handle both Carbon objects and strings
        $carbon = $timeValue instanceof \Carbon\Carbon
            ? $timeValue
            : \Carbon\Carbon::parse($timeValue);

        // With app timezone set to Asia/Kolkata, Eloquent creates Carbon objects
        // in IST. We just need to ensure the timezone is correct and return ISO string.
        $tzName = $carbon->getTimezone()->getName();

        // If not already in Asia/Kolkata, convert it
        if ($tzName !== 'Asia/Kolkata') {
            $carbon = $carbon->setTimezone('Asia/Kolkata');
        }

        return $carbon->toIso8601String();
    }

    public function toArray(Request $request): array
    {
        return [
            'id'                    => $this->id,
            'date'                  => $this->date?->format('Y-m-d'),
            'check_in_time'         => $this->formatTimeAsIso($this->check_in_time),
            'check_out_time'        => $this->formatTimeAsIso($this->check_out_time),
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
