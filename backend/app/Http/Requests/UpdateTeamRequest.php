<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTeamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $teamId = $this->route('team');

        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('teams')->ignore($teamId)],
            'description' => ['nullable', 'string'],
            'team_lead_id' => ['nullable', 'exists:users,id'],
        ];
    }
}
