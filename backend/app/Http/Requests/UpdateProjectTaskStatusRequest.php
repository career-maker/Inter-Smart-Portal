<?php

namespace App\Http\Requests;

use App\Models\ProjectTask;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProjectTaskStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', 'string', Rule::in(ProjectTask::STATUSES)],
            // Doubles as the rejection reason when status = Rejected.
            'deviation_reason' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
