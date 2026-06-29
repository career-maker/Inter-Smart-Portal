<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLeaveStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => 'required|in:Approved,Rejected',
            'rejection_reason' => 'nullable|string|max:1000',
            'remarks' => 'nullable|string|max:1000'
        ];
    }
}
