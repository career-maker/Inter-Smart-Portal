<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttendanceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'date' => $this->date,
            'check_in_time' => $this->check_in_time,
            'check_out_time' => $this->check_out_time,
            'total_working_minutes' => $this->total_working_minutes,
            'status' => $this->status,
            'user' => $this->whenLoaded('user', function () {
                return [
                    'id' => $this->user->id,
                    'first_name' => $this->user->first_name,
                    'last_name' => $this->user->last_name,
                ];
            }),
            'breaks' => $this->whenLoaded('breaks'),
        ];
    }
}
