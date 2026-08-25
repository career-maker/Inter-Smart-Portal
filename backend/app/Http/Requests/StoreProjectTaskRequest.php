<?php

namespace App\Http\Requests;

use App\Models\ProjectTask;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'sub_phase_id' => ['nullable', 'integer', 'exists:pm_sub_phases,id'],
            'catalog_task_id' => [
                'nullable',
                'integer',
                Rule::exists('pm_task_catalogs', 'id')
                    ->whereNull('deleted_at')
                    ->where('is_active', true),
            ],
            'coordinator_id' => ['nullable', 'integer', 'exists:users,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'status' => ['nullable', 'string', Rule::in(ProjectTask::STATUSES)],
            'priority' => ['nullable', 'string', Rule::in(ProjectTask::PRIORITIES)],
            'start_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'include_saturday' => ['nullable', 'boolean'],
            'include_sunday' => ['nullable', 'boolean'],
            'current_updates' => ['nullable', 'string', 'max:5000'],
            'sprint' => ['nullable', 'string', 'max:255'],
            'sprint_link' => ['nullable', 'string', 'url', 'max:2048'],
            'allotted_days' => ['nullable', 'numeric', 'min:0', 'max:9999.99'],
            'team_id' => ['nullable', 'integer', 'exists:teams,id'],
            // Multiple assignees may be supplied on create (a proper
            // many-to-many, never a duplicated task row — Decision 3).
            'assignee_ids' => ['nullable', 'array', 'max:50'],
            'assignee_ids.*' => ['integer', 'exists:users,id'],
        ];
    }
}
