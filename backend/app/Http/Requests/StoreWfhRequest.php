<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreWfhRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $isHalfDay = in_array($this->input('duration_type'), ['Half-Morning', 'Half-Afternoon']);

        return [
            'duration_type' => 'required|in:Full,Half-Morning,Half-Afternoon',
            'start_date'    => 'required|date',
            'end_date'      => $isHalfDay
                                ? 'nullable|date|same:start_date'
                                : 'required|date|after_or_equal:start_date',
            'reason'        => 'required|string|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'duration_type.required' => 'Please select a WFH type.',
            'duration_type.in'       => 'Invalid WFH type selected.',
            'start_date.required'    => 'Please select a date.',
            'end_date.required'      => 'Please select an end date.',
            'end_date.after_or_equal'=> 'End date must be on or after the start date.',
            'reason.required'        => 'Please provide a reason or task description.',
        ];
    }
}
