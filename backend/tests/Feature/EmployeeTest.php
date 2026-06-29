<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class EmployeeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'Super Admin']);
        Role::firstOrCreate(['name' => 'HR']);
        Role::firstOrCreate(['name' => 'Employee']);
    }

    public function test_hr_can_create_employee()
    {
        $hr = User::factory()->create();
        $hr->assignRole('HR');

        $token = $hr->createToken('auth_token')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/employees', [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john.doe@example.com',
            'password' => 'password123',
            'employee_code' => 'EMP1001',
            'role' => 'Employee',
            'status' => 'Active',
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.email', 'john.doe@example.com');
                 
        $this->assertDatabaseHas('users', [
            'email' => 'john.doe@example.com',
        ]);
    }

    public function test_standard_employee_cannot_create_employee()
    {
        $employee = User::factory()->create();
        $employee->assignRole('Employee');

        $token = $employee->createToken('auth_token')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/employees', [
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'email' => 'jane.doe@example.com',
            'password' => 'password123',
            'employee_code' => 'EMP1002',
            'role' => 'Employee',
        ]);

        // Standard employee doesn't have permission to store, so likely 403 or 401 depending on setup.
        // Assuming the route is protected by spatie permission middleware or custom logic.
        $response->assertStatus(403);
    }
}
