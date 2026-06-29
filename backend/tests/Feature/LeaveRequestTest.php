<?php

namespace Tests\Feature;

use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;
use Carbon\Carbon;

class LeaveRequestTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'Super Admin']);
        Role::firstOrCreate(['name' => 'HR']);
        Role::firstOrCreate(['name' => 'Employee']);
    }

    public function test_employee_can_submit_leave_request()
    {
        $employee = User::factory()->create();
        $employee->assignRole('Employee');
        \App\Models\LeaveBalance::create([
            'user_id' => $employee->id,
            'casual_leave_balance' => 12,
            'sick_leave_balance' => 12,
            'total_leaves_taken' => 0
        ]);
        $token = $employee->createToken('auth_token')->plainTextToken;

        $leaveType = LeaveType::create([
            'name' => 'Casual Leave',
            'is_paid' => true
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/leave-requests', [
            'leave_type_id' => $leaveType->id,
            'leave_date' => Carbon::tomorrow()->toDateString(),
            'duration_type' => 'Full',
            'reason' => 'Personal work'
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.status', 'Pending');
    }

    public function test_manager_can_approve_leave_request()
    {
        $employee = User::factory()->create();
        $employee->assignRole('Employee');
        \App\Models\LeaveBalance::create([
            'user_id' => $employee->id,
            'casual_leave_balance' => 12,
            'sick_leave_balance' => 12,
            'total_leaves_taken' => 0
        ]);

        $manager = User::factory()->create();
        $manager->assignRole('HR'); // Or a role that allows managing leaves

        $token = $manager->createToken('auth_token')->plainTextToken;

        $leaveType = LeaveType::create([
            'name' => 'Sick Leave',
            'is_paid' => true
        ]);

        $leaveRequest = LeaveRequest::create([
            'user_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
            'leave_date' => Carbon::tomorrow()->toDateString(),
            'duration_type' => 'Full',
            'reason' => 'Sick',
            'status' => 'Pending'
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/leave-requests/' . $leaveRequest->id . '/status', [
            'status' => 'Approved'
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('leave_requests', [
            'id' => $leaveRequest->id,
            'status' => 'Approved'
        ]);
    }

    public function test_manager_can_reject_leave_request()
    {
        $employee = User::factory()->create();
        $employee->assignRole('Employee');
        \App\Models\LeaveBalance::create([
            'user_id' => $employee->id,
            'casual_leave_balance' => 12,
            'sick_leave_balance' => 12,
            'total_leaves_taken' => 0
        ]);

        $manager = User::factory()->create();
        $manager->assignRole('HR');

        $token = $manager->createToken('auth_token')->plainTextToken;

        $leaveType = LeaveType::create([
            'name' => 'Casual Leave',
            'is_paid' => true
        ]);

        $leaveRequest = LeaveRequest::create([
            'user_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
            'leave_date' => Carbon::tomorrow()->toDateString(),
            'duration_type' => 'Full',
            'reason' => 'Vacation',
            'status' => 'Pending'
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/leave-requests/' . $leaveRequest->id . '/status', [
            'status' => 'Rejected',
            'rejection_reason' => 'Not possible right now'
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('leave_requests', [
            'id' => $leaveRequest->id,
            'status' => 'Rejected',
            'rejection_reason' => 'Not possible right now'
        ]);
    }
}
