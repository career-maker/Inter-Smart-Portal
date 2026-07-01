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
            'employee_code'              => ['sometimes', 'nullable', 'string', 'max:50', Rule::unique('users', 'employee_code')->ignore($userId)],
            'first_name'                 => ['sometimes', 'nullable', 'string', 'max:100'],
            'last_name'                  => ['sometimes', 'nullable', 'string', 'max:100'],
            'email'                      => ['sometimes', 'nullable', 'email', Rule::unique('users')->ignore($userId)],
            'personal_email'             => ['sometimes', 'nullable', 'email'],
            'contact_number'             => ['sometimes', 'nullable', 'string', 'max:20'],
            'alternate_contact_number'   => ['sometimes', 'nullable', 'string', 'max:20'],
            'designation'                => ['sometimes', 'nullable', 'string', 'max:100'],
            'joining_date'               => ['sometimes', 'nullable', 'date'],
            'dob'                        => ['sometimes', 'nullable', 'date'],
            'gender'                     => ['sometimes', 'nullable', 'in:Male,Female,Other'],
            'blood_group'                => ['sometimes', 'nullable', 'string', 'max:10'],
            'marital_status'             => ['sometimes', 'nullable', 'string', 'max:50'],
            'permanent_address'          => ['sometimes', 'nullable', 'string'],
            'current_address'            => ['sometimes', 'nullable', 'string'],
            'team_id'                    => ['sometimes', 'nullable', 'exists:teams,id'],
            'role'                       => ['sometimes', 'nullable', 'string', 'exists:roles,name'],
            'status'                     => ['sometimes', 'nullable', 'string', 'in:Active,Disabled,Resigned,Terminated'],
        ];
    }
}
