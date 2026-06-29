<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmployeeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'employee_code' => $this->employee_code,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'email' => $this->email,
            'personal_email' => $this->personal_email,
            'contact_number' => $this->contact_number,
            'alternate_contact_number' => $this->alternate_contact_number,
            'designation' => $this->designation,
            'joining_date' => $this->joining_date,
            'dob' => $this->dob,
            'gender' => $this->gender,
            'blood_group' => $this->blood_group,
            'marital_status' => $this->marital_status,
            'permanent_address' => $this->permanent_address,
            'current_address' => $this->current_address,
            'status' => $this->status,
            'profile_photo_path' => $this->profile_photo_path ? asset('storage/' . $this->profile_photo_path) : null,
            'team_id' => $this->team_id,
            'team' => $this->whenLoaded('team', function () {
                return [
                    'id' => $this->team->id,
                    'name' => $this->team->name,
                ];
            }),
            'role' => $this->whenLoaded('roles', function () {
                return $this->roles->pluck('name')->first();
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
