<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge(
            collect($this->all())->map(fn($v) => $v === '' ? null : $v)->toArray()
        );
    }

    public function rules(): array
    {
        $employeeCodeRule = ['nullable', 'string', 'max:50'];

        // Only add unique rule if employee_code is provided
        if ($this->filled('employee_code')) {
            $employeeCodeRule[] = 'unique:users,employee_code';
        }

        return [
            'employee_code'              => $employeeCodeRule,
            'first_name'                 => ['required', 'string', 'max:100'],
            'last_name'                  => ['nullable', 'string', 'max:100'],
            'email'                      => ['required', 'email', 'unique:users,email'],
            'personal_email'             => ['nullable', 'email'],
            'contact_number'             => ['nullable', 'string', 'max:20'],
            'alternate_contact_number'   => ['nullable', 'string', 'max:20'],
            'designation'                => ['nullable', 'string', 'max:100'],
            'joining_date'               => ['nullable', 'date'],
            'dob'                        => ['nullable', 'date'],
            'gender'                     => ['nullable', 'in:Male,Female,Other'],
            'blood_group'                => ['nullable', 'string', 'max:10'],
            'marital_status'             => ['nullable', 'string', 'max:50'],
            'permanent_address'          => ['nullable', 'string'],
            'current_address'            => ['nullable', 'string'],
            'team_id'                    => ['nullable', 'exists:teams,id'],
            'role'                       => ['nullable', 'string', 'exists:roles,name'],
            'password'                   => ['nullable', 'string', 'min:6'],
        ];
    }
}
