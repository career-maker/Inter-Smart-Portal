<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Middleware handles auth
    }

    public function rules(): array
    {
        return [
            'employee_code' => ['required', 'string', 'max:50', 'unique:users,employee_code'],
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['nullable', 'string', 'max:100'],
            'email' => ['required', 'email', 'unique:users,email'],
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
            'role' => ['required', 'string', 'exists:roles,name'],
            'password' => ['required', 'string', 'min:6'],
        ];
    }
}
