<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\LeaveBalance;
use App\Models\LeavePolicySetting;
use App\Models\EmployeeLeavePolicy;
use App\Models\LeaveAllocationLedger;
use App\Services\LeavePolicyEngine;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class LeavePolicyEngineTest extends TestCase
{
    use RefreshDatabase;

    protected LeavePolicyEngine $engine;

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'Super Admin']);
        Role::firstOrCreate(['name' => 'HR']);
        Role::firstOrCreate(['name' => 'Employee']);

        $this->engine = app(LeavePolicyEngine::class);

        // Set default global policy
        LeavePolicySetting::updateOrCreate(
            ['id' => 1],
            [
                'monthly_cycle_start_day'   => 26,
                'probation_period_months'   => 6,
                'default_monthly_cl'        => 1.00,
                'default_monthly_sl'        => 1.00,
                'cl_carry_forward_years'    => 2,
                'sl_carry_forward_allowed'  => false,
            ]
        );
    }

    public function test_scenario_a_normal_employee_completes_probation_and_receives_monthly_allocation()
    {
        // Employee joined 1 year ago (probation long completed)
        $employee = User::factory()->create([
            'status'       => 'Active',
            'joining_date' => Carbon::now('Asia/Kolkata')->subYear()->toDateString(),
        ]);
        $employee->assignRole('Employee');

        LeaveBalance::create([
            'user_id'              => $employee->id,
            'casual_leave_balance' => 5.0,
            'sick_leave_balance'   => 3.0,
        ]);

        $evalDate = Carbon::parse('2026-08-26', 'Asia/Kolkata');
        $result = $this->engine->processMonthlyCycleAllocation($evalDate);

        $this->assertEquals(1, $result['allocated_count']);

        $balance = LeaveBalance::where('user_id', $employee->id)->first();
        $this->assertEquals(6.0, $balance->casual_leave_balance); // 5 + 1
        $this->assertEquals(4.0, $balance->sick_leave_balance);   // 3 + 1

        // Verify ledger entries
        $this->assertDatabaseHas('leave_allocation_ledgers', [
            'user_id'          => $employee->id,
            'leave_type'       => 'Casual Leave',
            'amount'           => 1.0,
            'transaction_type' => 'automatic_allocation',
            'cycle_key'        => '2026-08-26',
        ]);
    }

    public function test_scenario_b_employee_in_probation_does_not_receive_auto_allocation()
    {
        // Employee joined 2 months ago (probation 6 months)
        $employee = User::factory()->create([
            'status'       => 'Active',
            'joining_date' => Carbon::parse('2026-06-10', 'Asia/Kolkata')->toDateString(),
        ]);
        $employee->assignRole('Employee');

        LeaveBalance::create([
            'user_id'              => $employee->id,
            'casual_leave_balance' => 0,
            'sick_leave_balance'   => 0,
        ]);

        $evalDate = Carbon::parse('2026-08-26', 'Asia/Kolkata');
        $result = $this->engine->processMonthlyCycleAllocation($evalDate);

        $this->assertEquals(0, $result['allocated_count']);
        $this->assertEquals(1, $result['skipped_probation_count']);

        $balance = LeaveBalance::where('user_id', $employee->id)->first();
        $this->assertEquals(0, $balance->casual_leave_balance);
        $this->assertEquals(0, $balance->sick_leave_balance);
    }

    public function test_scenario_c_probation_completion_unlocks_eligibility_next_day()
    {
        // Joined 2026-01-10 -> 6 months probation ends 2026-07-10.
        // Becomes eligible on 2026-07-11.
        $employee = User::factory()->create([
            'status'       => 'Active',
            'joining_date' => '2026-01-10',
        ]);
        $employee->assignRole('Employee');

        // On 2026-07-10 (last day of probation): ineligible
        $checkLastDay = $this->engine->isEmployeeEligibleForAutoAllocation($employee, Carbon::parse('2026-07-10', 'Asia/Kolkata'));
        $this->assertFalse($checkLastDay['eligible']);

        // On 2026-07-11 (next day after probation): eligible!
        $checkNextDay = $this->engine->isEmployeeEligibleForAutoAllocation($employee, Carbon::parse('2026-07-11', 'Asia/Kolkata'));
        $this->assertTrue($checkNextDay['eligible']);
    }

    public function test_scenario_d_admin_manual_leave_addition_clears_probation()
    {
        $admin = User::factory()->create(['status' => 'Active']);
        $admin->assignRole('Super Admin');

        $employee = User::factory()->create([
            'status'       => 'Active',
            'joining_date' => Carbon::now('Asia/Kolkata')->subMonth()->toDateString(), // Still in probation
        ]);
        $employee->assignRole('Employee');

        $this->assertFalse($this->engine->isEmployeeEligibleForAutoAllocation($employee)['eligible']);

        // Admin manually adds leave during probation
        $this->engine->recordManualAdjustment($admin, $employee, [
            'casual_leave_balance' => 2.0,
            'sick_leave_balance'   => 1.0,
        ], 'Early probation clearance test');

        // Employee should now be eligible!
        $eligibility = $this->engine->isEmployeeEligibleForAutoAllocation($employee);
        $this->assertTrue($eligibility['eligible']);
        $this->assertEquals('Cleared Manually', $eligibility['status']);

        // Next monthly cycle allocation allocates +1 CL and +1 SL
        $evalDate = Carbon::parse('2026-08-26', 'Asia/Kolkata');
        $this->engine->processMonthlyCycleAllocation($evalDate);

        $balance = LeaveBalance::where('user_id', $employee->id)->first();
        $this->assertEquals(3.0, $balance->casual_leave_balance); // 2 + 1
        $this->assertEquals(2.0, $balance->sick_leave_balance);   // 1 + 1
    }

    public function test_scenario_e_idempotency_prevents_duplicate_credits()
    {
        $employee = User::factory()->create([
            'status'       => 'Active',
            'joining_date' => '2025-01-01',
        ]);
        $employee->assignRole('Employee');

        LeaveBalance::create([
            'user_id'              => $employee->id,
            'casual_leave_balance' => 10.0,
            'sick_leave_balance'   => 5.0,
        ]);

        $evalDate = Carbon::parse('2026-08-26', 'Asia/Kolkata');

        // First run
        $run1 = $this->engine->processMonthlyCycleAllocation($evalDate);
        $this->assertEquals(1, $run1['allocated_count']);

        // Second run in same cycle (scheduler retry / refresh)
        $run2 = $this->engine->processMonthlyCycleAllocation($evalDate);
        $this->assertEquals(0, $run2['allocated_count']);
        $this->assertEquals(1, $run2['skipped_already_allocated']);

        // Balance should have increased by exactly 1, not 2
        $balance = LeaveBalance::where('user_id', $employee->id)->first();
        $this->assertEquals(11.0, $balance->casual_leave_balance);
        $this->assertEquals(6.0, $balance->sick_leave_balance);
    }

    public function test_scenario_f_employee_specific_allocation_override()
    {
        $employee = User::factory()->create([
            'status'       => 'Active',
            'joining_date' => '2025-01-01',
        ]);
        $employee->assignRole('Employee');

        // Custom override: 2 CL, 3 SL
        EmployeeLeavePolicy::create([
            'user_id'           => $employee->id,
            'custom_monthly_cl' => 2.0,
            'custom_monthly_sl' => 3.0,
        ]);

        LeaveBalance::create([
            'user_id'              => $employee->id,
            'casual_leave_balance' => 0,
            'sick_leave_balance'   => 0,
        ]);

        $evalDate = Carbon::parse('2026-08-26', 'Asia/Kolkata');
        $this->engine->processMonthlyCycleAllocation($evalDate);

        $balance = LeaveBalance::where('user_id', $employee->id)->first();
        $this->assertEquals(2.0, $balance->casual_leave_balance);
        $this->assertEquals(3.0, $balance->sick_leave_balance);
    }

    public function test_scenario_g_sl_expires_annually_and_cl_cf_expires_after_2_years()
    {
        $employee = User::factory()->create(['status' => 'Active']);
        $employee->assignRole('Employee');

        LeaveBalance::create([
            'user_id'               => $employee->id,
            'casual_leave_balance'  => 10.0,
            'cl_carry_forward'      => 4.0,
            'cl_carry_forward_year' => 2023, // 3 years old -> expired in 2026
            'sick_leave_balance'    => 6.0,  // Should expire at year end
        ]);

        $evalDate = Carbon::parse('2026-12-26', 'Asia/Kolkata');
        $result = $this->engine->processYearEndExpiration(2026, $evalDate);

        $this->assertEquals(1, $result['expired_sl_count']);
        $this->assertEquals(1, $result['expired_cf_count']);

        $balance = LeaveBalance::where('user_id', $employee->id)->first();
        $this->assertEquals(10.0, $balance->casual_leave_balance); // Current CL preserved
        $this->assertEquals(0, $balance->cl_carry_forward);        // Old CF expired
        $this->assertEquals(0, $balance->sick_leave_balance);      // SL reset to 0
    }

    public function test_employee_without_policy_row_does_not_crash_php()
    {
        // Normal employee with no employee_leave_policies row in database
        $employee = User::factory()->create([
            'status'       => 'Active',
            'joining_date' => '2024-01-01',
        ]);
        $employee->assignRole('Employee');

        // Should evaluate without throwing null property access ErrorException
        $eligibility = $this->engine->isEmployeeEligibleForAutoAllocation($employee);
        $this->assertTrue($eligibility['eligible']);
        $this->assertFalse($employee->isInProbation());
    }

    public function test_single_employee_allocation_and_custom_override_topup()
    {
        $employee = User::factory()->create([
            'status'       => 'Active',
            'joining_date' => '2024-01-01',
        ]);
        $employee->assignRole('Employee');

        // Initially allocate default 1 CL + 1 SL
        $evalDate = Carbon::parse('2026-08-28', 'Asia/Kolkata'); // Evaluated on 28th (not 26th)
        $res = $this->engine->ensureEmployeeAllocatedForCurrentCycle($employee, $evalDate);
        $this->assertNotNull($res);
        $this->assertEquals(1.0, $res['cl_amount']);
        $this->assertEquals(1.0, $res['sl_amount']);

        $balance = LeaveBalance::where('user_id', $employee->id)->first();
        $this->assertEquals(1.0, $balance->casual_leave_balance);
        $this->assertEquals(1.0, $balance->sick_leave_balance);

        // Admin now sets custom quota: 2.5 CL, 2.0 SL for this employee
        EmployeeLeavePolicy::create([
            'user_id'           => $employee->id,
            'custom_monthly_cl' => 2.5,
            'custom_monthly_sl' => 2.0,
        ]);

        // Re-run ensure allocation for same cycle: should top up the delta (+1.5 CL, +1.0 SL)
        $topUpRes = $this->engine->ensureEmployeeAllocatedForCurrentCycle($employee, $evalDate);
        $this->assertNotNull($topUpRes);
        $this->assertEquals(1.5, $topUpRes['top_up_cl']);
        $this->assertEquals(1.0, $topUpRes['top_up_sl']);

        $balance->refresh();
        $this->assertEquals(2.5, $balance->casual_leave_balance);
        $this->assertEquals(2.0, $balance->sick_leave_balance);
    }
}
