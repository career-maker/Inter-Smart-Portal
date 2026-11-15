<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmployeeResource extends JsonResource
{
    /** @var array<int, int[]> viewer id => team ids they lead or belong to (one lookup per request) */
    private static array $viewerTeams = [];

    /**
     * Personal details (birth date, home address, personal e-mail ...) are shown to Super Admin / Admin / HR,
     * to the person themselves, and to the lead of that person's team. Everyone else, such as a Team Lead looking
     * at another team, gets work details only. Audit 15 Nov 2026, finding H-03.
     */
    private function mayShowPersonal(Request $request): bool
    {
        $viewer = $request->user();
        if (! $viewer) {
            return false;
        }
        if ($viewer->id === $this->id || $viewer->hasAnyRole(['Super Admin', 'Admin', 'HR'])) {
            return true;
        }
        self::$viewerTeams[$viewer->id] ??= \App\Models\Team::where('team_lead_id', $viewer->id)->pluck('id')->map(fn ($i) => (int) $i)->all();

        return $this->team_id !== null && in_array((int) $this->team_id, self::$viewerTeams[$viewer->id], true);
    }

    public function toArray(Request $request): array
    {
        $personal = $this->mayShowPersonal($request);

        return [
            'id' => $this->id,
            'employee_code' => $this->employee_code,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'email' => $this->email,
            'personal_email' => $personal ? $this->personal_email : null,
            'contact_number' => $this->contact_number,
            'alternate_contact_number' => $personal ? $this->alternate_contact_number : null,
            'designation' => $this->designation,
            'joining_date' => $this->joining_date,
            'probation_end_date' => $this->probationEndDate(),
            'is_in_probation' => $this->isInProbation(),
            'dob' => $personal ? $this->dob : null,
            'gender' => $personal ? $this->gender : null,
            'blood_group' => $personal ? $this->blood_group : null,
            'marital_status' => $personal ? $this->marital_status : null,
            'permanent_address' => $personal ? $this->permanent_address : null,
            'current_address' => $personal ? $this->current_address : null,
            'status' => $this->status,
            'is_emergency_contact' => (bool) ($this->is_emergency_contact ?? false),
            'profile_photo_path' => $this->profilePhotoUrl(),
            'team_id' => $this->team_id,
            'team' => $this->whenLoaded('team', function () {
                return [
                    'id' => $this->team->id,
                    'name' => $this->team->name,
                ];
            }),
            'role' => $this->whenLoaded('roles', function () {
                return $this->primaryRoleName();
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
