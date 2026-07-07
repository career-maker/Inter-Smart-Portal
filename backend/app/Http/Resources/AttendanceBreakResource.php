<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Serializes AttendanceBreak records, shifting stored local wall-clock
 * timestamps (which Eloquent labels UTC) to the correct Asia/Kolkata offset
 * so the browser receives an unambiguous ISO-8601 string (e.g. +05:30)
 * and does NOT apply a second timezone conversion.
 */
class AttendanceBreakResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'break_start'         => $this->break_start
                ? $this->break_start->shiftTimezone('Asia/Kolkata')->toIso8601String()
                : null,
            'break_end'           => $this->break_end
                ? $this->break_end->shiftTimezone('Asia/Kolkata')->toIso8601String()
                : null,
            'total_break_minutes' => $this->total_break_minutes,
            'break_type'          => $this->break_type ?? null,
            'source'              => $this->source ?? null,
        ];
    }
}
