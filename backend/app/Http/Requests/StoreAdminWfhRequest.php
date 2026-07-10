<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAdminWfhRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('Super Admin');
    }

    public function rules(): array
    {
        return [
            'user_id'         => 'required|exists:users,id',
            'wfh_type_id'     => 'required|exists:leave_types,id',
            'start_date'      => 'required|date',
            'end_date'        => 'required|date|after_or_equal:start_date',
            'reason'          => 'required|string|max:1000',
            'attachment_link' => 'nullable|url|max:2048',
            'duration_type'   => 'nullable|string|in:Full,Half-Morning,Half-Afternoon',
            'auto_approve'    => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'user_id.required' => 'Employee ID is required',
            'user_id.exists' => 'Selected employee does not exist',
            'wfh_type_id.required' => 'WFH type is required. Please select a type.',
            'wfh_type_id.exists' => 'Selected WFH type does not exist in the system',
            'start_date.required' => 'Start date is required',
            'start_date.date' => 'Start date must be a valid date',
            'end_date.required' => 'End date is required',
            'end_date.date' => 'End date must be a valid date',
            'end_date.after_or_equal' => 'End date must be on or after start date',
            'reason.required' => 'Reason is required',
            'reason.string' => 'Reason must be text',
            'reason.max' => 'Reason cannot exceed 1000 characters',
        ];
    }
}
