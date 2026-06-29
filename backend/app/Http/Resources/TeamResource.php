<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'team_lead_id' => $this->team_lead_id,
            'team_lead' => $this->whenLoaded('teamLead', function () {
                return [
                    'id' => $this->teamLead->id,
                    'first_name' => $this->teamLead->first_name,
                    'last_name' => $this->teamLead->last_name,
                    'email' => $this->teamLead->email,
                    'profile_photo_path' => $this->teamLead->profile_photo_path ? asset('storage/' . $this->teamLead->profile_photo_path) : null,
                ];
            }),
            'members_count' => $this->whenCounted('members'),
            'members' => $this->whenLoaded('members', function () {
                return EmployeeResource::collection($this->members);
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
