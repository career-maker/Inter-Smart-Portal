<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLeaveRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'leave_type_id'   => 'required|exists:leave_types,id',
            'start_date'      => 'required|date|after_or_equal:today',
            'end_date'        => 'required|date|after_or_equal:start_date',
            'reason'          => 'required|string|max:1000',
            'attachment_link' => 'nullable|url|max:2048',
            'duration_type'   => 'nullable|string|in:Full,Half-Morning,Half-Afternoon',
        ];
    }
}
