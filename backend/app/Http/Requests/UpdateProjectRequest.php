<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'status' => ['sometimes', 'required', 'string', 'in:Planning,Active,On Hold,Completed,Cancelled'],
            'project_type' => ['sometimes', 'nullable', 'string', 'max:255'],
            'category' => ['sometimes', 'nullable', 'string', 'max:255'],
            'team_id' => ['sometimes', 'nullable', 'integer', 'exists:teams,id'],
            'project_coordinator_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'start_date' => ['sometimes', 'required', 'date'],
            'expected_end_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:start_date'],
            'allotted_effort' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:99999.99'],
            'confirmed_effort' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:99999.99'],
            'expected_effort' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:99999.99'],
            'committed_effort' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:99999.99'],
            'hubstaff_project_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'blockers' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'budget' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'live_notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'fixing_notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ];
    }
}
