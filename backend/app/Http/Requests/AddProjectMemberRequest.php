<?php

namespace App\Http\Requests;

use App\Models\ProjectMember;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AddProjectMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => ['required', 'integer', 'exists:users,id'],
            // 'Coordinator' is intentionally NOT an accepted value here —
            // coordinator status lives only in project_coordinator_id /
            // pm_tasks.coordinator_id (see ProjectMember model doc comment).
            'project_role' => ['nullable', 'string', Rule::in(ProjectMember::ROLES)],
        ];
    }
}
