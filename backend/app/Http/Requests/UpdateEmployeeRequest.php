<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->route('employee');

        return [
            'employee_code' => ['sometimes', 'required', 'string', 'max:50', 'unique:users,employee_code,' . $userId],
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['nullable', 'string', 'max:100'],
            'email' => ['required', 'email', Rule::unique('users')->ignore($userId)],
            'personal_email' => ['nullable', 'email'],
            'contact_number' => ['nullable', 'string', 'max:20'],
            'alternate_contact_number' => ['nullable', 'string', 'max:20'],
            'designation' => ['nullable', 'string', 'max:100'],
            'joining_date' => ['nullable', 'date'],
            'dob' => ['nullable', 'date'],
            'gender' => ['nullable', 'in:Male,Female,Other'],
            'blood_group' => ['nullable', 'string', 'max:10'],
            'marital_status' => ['nullable', 'string', 'max:50'],
            'permanent_address' => ['nullable', 'string'],
            'current_address' => ['nullable', 'string'],
            'team_id' => ['nullable', 'exists:teams,id'],
            'role' => ['nullable', 'string', 'exists:roles,name'],
        ];
    }
}
