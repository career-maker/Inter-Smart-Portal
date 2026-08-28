<?php

namespace App\Http\Requests;

use App\Models\ProjectTask;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates the FULL possible field shape for a task update. WHICH of
 * these submitted fields the caller is actually allowed to apply
 * (planning vs. execution — Decision 2) is decided in the controller,
 * not here — this request only validates shape/type, matching the
 * existing codebase's authorize()=>true convention.
 */
class UpdateProjectTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Planning fields
            'sub_phase_id' => ['sometimes', 'nullable', 'integer', 'exists:pm_sub_phases,id'],
            'catalog_task_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('pm_task_catalogs', 'id')->whereNull('deleted_at'),
            ],
            'coordinator_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'priority' => ['sometimes', 'nullable', 'string', Rule::in(ProjectTask::PRIORITIES)],
            'start_date' => ['sometimes', 'nullable', 'date'],
            'due_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:start_date'],
            'include_saturday' => ['sometimes', 'boolean'],
            'include_sunday' => ['sometimes', 'boolean'],
            'sprint' => ['sometimes', 'nullable', 'string', 'max:255'],
            'sprint_link' => ['sometimes', 'nullable', 'string', 'url', 'max:2048'],
            'allotted_days' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999.99'],
            'activity_percentage' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:999.99'],
            'team_id' => ['sometimes', 'nullable', 'integer', 'exists:teams,id'],

            // Execution & QA Bug Tracking fields
            'status' => ['sometimes', 'required', 'string', Rule::in(ProjectTask::STATUSES)],
            'current_updates' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'deviation_reason' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'actual_start_date' => ['sometimes', 'nullable', 'date'],
            'actual_completion_date' => ['sometimes', 'nullable', 'date'],
            'time_taken' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999.99'],
            'days_taken' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999.99'],
            'html_bugs' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:999999'],
            'functional_bugs' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:999999'],
            'total_bugs' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:999999'],
            'bug_tracker_link' => ['sometimes', 'nullable', 'string', 'url', 'max:2048'],
        ];
    }
}
