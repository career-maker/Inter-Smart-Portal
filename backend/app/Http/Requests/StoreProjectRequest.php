<?php

namespace App\Http\Requests;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;

class StoreProjectRequest extends FormRequest
{
    // Authorization is enforced in the controller/service (object-level +
    // capability checks), matching the existing codebase's convention —
    // every existing FormRequest in this app hardcodes authorize() => true.
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'status' => ['nullable', 'string', 'in:Planning,Active,On Hold,Completed,Cancelled'],
            'project_type' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'team_id' => ['nullable', 'integer', 'exists:teams,id'],
            'project_coordinator_id' => ['nullable', 'integer', 'exists:users,id'],
            'start_date' => ['required', 'date'],
            'expected_end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'allotted_effort' => ['nullable', 'numeric', 'min:0', 'max:99999.99'],
            'confirmed_effort' => ['nullable', 'numeric', 'min:0', 'max:99999.99'],
            'expected_effort' => ['nullable', 'numeric', 'min:0', 'max:99999.99'],
            'committed_effort' => ['nullable', 'numeric', 'min:0', 'max:99999.99'],
            'hubstaff_project_id' => ['nullable', 'string', 'max:255'],
            'blockers' => ['nullable', 'string', 'max:5000'],
            'budget' => ['nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'live_notes' => ['nullable', 'string', 'max:5000'],
            'fixing_notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    public function statuses(): array
    {
        return ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'];
    }
}
