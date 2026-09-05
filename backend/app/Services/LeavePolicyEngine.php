<?php

namespace App\Services;

use App\Models\User;
use App\Models\LeaveBalance;
use App\Models\LeavePolicySetting;
use App\Models\EmployeeLeavePolicy;
use App\Models\LeaveAllocationLedger;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LeavePolicyEngine
{
    /**
     * Get global settings with fallback defaults.
     */
    public function getSettings(): LeavePolicySetting
    {
        return LeavePolicySetting::current();
    }

    /**
     * Compute cycle metadata based on the configured monthly_cycle_start_day.
     */
    public function getCycleInfo(?Carbon $date = null): array
    {
        $d = $date ? $date->copy()->setTimezone('Asia/Kolkata') : Carbon::now('Asia/Kolkata');
        $settings = $this->getSettings();
        $startDay = (int) ($settings->monthly_cycle_start_day ?? 26);
        $startDay = max(1, min(28, $startDay)); // Clamp to 1..28 for safety across months

        if ($d->day >= $startDay) {
            $cycleStart = $d->copy()->setDay($startDay)->startOfDay();
            $cycleEnd   = $d->copy()->addMonth()->setDay($startDay)->subDay()->endOfDay();
            $cycleKey   = $d->format('Y-m') . '-' . sprintf('%02d', $startDay);
            $cycleMonth = $d->format('F Y');
        } else {
            $prevMonth  = $d->copy()->subMonth();
            $cycleStart = $prevMonth->copy()->setDay($startDay)->startOfDay();
            $cycleEnd   = $d->copy()->setDay($startDay)->subDay()->endOfDay();
            $cycleKey   = $prevMonth->format('Y-m') . '-' . sprintf('%02d', $startDay);
            $cycleMonth = $prevMonth->format('F Y');
        }

        // Next automatic allocation moment (00:00:00 on the next cycle start day)
        $nextAllocation = $cycleEnd->copy()->addSecond();

        return [
            'start_day'         => $startDay,
            'cycle_key'         => $cycleKey,
            'cycle_month'       => $cycleMonth,
            'cycle_start_date'  => $cycleStart->toDateString(),
            'cycle_end_date'    => $cycleEnd->toDateString(),
            'next_allocation_at'=> $nextAllocation->toDateTimeString(),
            'is_cycle_start_day'=> $d->day === $startDay,
        ];
    }

    /**
     * Determine if an employee is eligible for automatic monthly leave allocation.
     * Rule: In-probation employees do NOT receive auto-allocation unless probation was manually cleared by admin.
     * Natural probation completion unlocks eligibility starting the NEXT day after probation ends.
     */
    public function isEmployeeEligibleForAutoAllocation(User $user, ?Carbon $asOfDate = null): array
    {
        $d = $asOfDate ? $asOfDate->copy()->setTimezone('Asia/Kolkata') : Carbon::now('Asia/Kolkata');

        // Check if employee has an active policy override or balance flag
        $empPolicy = $user->employeeLeavePolicy ?? EmployeeLeavePolicy::where('user_id', $user->id)->first();
        if ($empPolicy?->probation_cleared_manually || $user->leaveBalance?->probation_cleared_manually) {
            return [
                'eligible' => true,
                'reason'   => 'Probation manually cleared by administrator.',
                'status'   => 'Cleared Manually',
            ];
        }

        // Check joining date
        if (!$user->joining_date) {
            return [
                'eligible' => true,
                'reason'   => 'No joining date recorded (treated as regular active employee).',
                'status'   => 'Active',
            ];
        }

        $globalSettings = $this->getSettings();
        $probationMonths = $empPolicy?->custom_probation_months 
            ?? $globalSettings->probation_period_months 
            ?? 6;

        if ($probationMonths <= 0) {
            return [
                'eligible' => true,
                'reason'   => 'No probation period required.',
                'status'   => 'Active',
            ];
        }

        $joiningDate = Carbon::parse($user->joining_date, 'Asia/Kolkata')->startOfDay();
        $probationEndDate = $user->probation_end_date 
            ? Carbon::parse($user->probation_end_date, 'Asia/Kolkata')->endOfDay()
            : $joiningDate->copy()->addMonths($probationMonths)->endOfDay();

        $eligibleStartDate = $probationEndDate->copy()->addDay()->startOfDay();

        if ($d->lt($eligibleStartDate)) {
            $daysRemaining = max(0, $d->diffInDays($probationEndDate, false));
            return [
                'eligible'              => false,
                'reason'                => "Currently in probation until {$probationEndDate->toDateString()}.",
                'status'                => 'In Probation',
                'probation_end_date'    => $probationEndDate->toDateString(),
                'eligible_start_date'   => $eligibleStartDate->toDateString(),
                'days_remaining'        => (int) ceil($daysRemaining),
            ];
        }

        return [
            'eligible'              => true,
            'reason'                => "Completed probation on {$probationEndDate->toDateString()}.",
            'status'                => 'Probation Completed',
            'probation_end_date'    => $probationEndDate->toDateString(),
            'eligible_start_date'   => $eligibleStartDate->toDateString(),
        ];
    }

    /**
     * Process automatic monthly allocation for all active eligible employees.
     * Fully idempotent: will NOT allocate twice for the same cycle_key.
     */
    public function processMonthlyCycleAllocation(?Carbon $asOfDate = null, bool $force = false): array
    {
        $d = $asOfDate ? $asOfDate->copy()->setTimezone('Asia/Kolkata') : Carbon::now('Asia/Kolkata');
        $cycleInfo = $this->getCycleInfo($d);
        $cycleKey  = $cycleInfo['cycle_key'];
        $settings  = $this->getSettings();

        $activeEmployees = User::where('status', 'Active')
            ->when(\Illuminate\Support\Facades\Schema::hasColumn('users', 'role'), function ($q) {
                $q->where(function ($sub) {
                    $sub->whereNull('role')
                        ->orWhereRaw('LOWER(role) != ?', ['super admin']);
                });
            })
            ->whereDoesntHave('roles', fn($q) => $q->where('name', 'Super Admin'))
            ->with(['leaveBalance', 'employeeLeavePolicy'])
            ->get();

        $allocatedCount = 0;
        $skippedProbationCount = 0;
        $skippedAlreadyAllocatedCount = 0;
        $logs = [];

        foreach ($activeEmployees as $emp) {
            $eligibility = $this->isEmployeeEligibleForAutoAllocation($emp, $d);

            if (!$eligibility['eligible']) {
                $skippedProbationCount++;
                continue;
            }

            // Check idempotency: check if allocation already exists for this user and cycle_key
            $alreadyAllocated = LeaveAllocationLedger::where('user_id', $emp->id)
                ->where('cycle_key', $cycleKey)
                ->where('transaction_type', 'automatic_allocation')
                ->exists();

            if ($alreadyAllocated && !$force) {
                $skippedAlreadyAllocatedCount++;
                continue;
            }

            // Determine monthly amounts (Employee override or Global default)
            $empPolicy = $emp->employeeLeavePolicy;
            $clAmount = ($empPolicy && $empPolicy->custom_monthly_cl !== null)
                ? (float) $empPolicy->custom_monthly_cl
                : (float) ($settings->default_monthly_cl ?? 1.0);
            $slAmount = ($empPolicy && $empPolicy->custom_monthly_sl !== null)
                ? (float) $empPolicy->custom_monthly_sl
                : (float) ($settings->default_monthly_sl ?? 1.0);

            DB::transaction(function () use ($emp, $clAmount, $slAmount, $cycleKey, $cycleInfo, &$allocatedCount, &$logs) {
                $balance = LeaveBalance::firstOrCreate(
                    ['user_id' => $emp->id],
                    ['casual_leave_balance' => 0, 'sick_leave_balance' => 0, 'cl_carry_forward' => 0]
                );

                $oldCL = (float) $balance->casual_leave_balance;
                $newCL = $oldCL + $clAmount;

                $oldSL = (float) $balance->sick_leave_balance;
                $newSL = $oldSL + $slAmount;

                // 1. Record Casual Leave Ledger Entry
                LeaveAllocationLedger::create([
                    'user_id'          => $emp->id,
                    'leave_type'       => 'Casual Leave',
                    'amount'           => $clAmount,
                    'transaction_type' => 'automatic_allocation',
                    'cycle_key'        => $cycleKey,
                    'opening_balance'  => $oldCL,
                    'closing_balance'  => $newCL,
                    'modified_by'      => null, // System automated
                    'remarks'          => "Automatic monthly allocation for cycle {$cycleInfo['cycle_month']} (+{$clAmount} CL)",
                ]);

                // 2. Record Sick Leave Ledger Entry
                LeaveAllocationLedger::create([
                    'user_id'          => $emp->id,
                    'leave_type'       => 'Sick Leave',
                    'amount'           => $slAmount,
                    'transaction_type' => 'automatic_allocation',
                    'cycle_key'        => $cycleKey,
                    'opening_balance'  => $oldSL,
                    'closing_balance'  => $newSL,
                    'modified_by'      => null, // System automated
                    'remarks'          => "Automatic monthly allocation for cycle {$cycleInfo['cycle_month']} (+{$slAmount} SL)",
                ]);

                // 3. Update Leave Balance
                $balance->casual_leave_balance = $newCL;
                $balance->sick_leave_balance   = $newSL;
                $balance->last_allocated_cycle = $cycleKey;
                $balance->save();

                $allocatedCount++;
                $logs[] = "Allocated +{$clAmount} CL & +{$slAmount} SL to {$emp->first_name} {$emp->last_name} (Cycle: {$cycleKey})";
            });
        }

        return [
            'status'                      => 'success',
            'cycle_key'                   => $cycleKey,
            'cycle_month'                 => $cycleInfo['cycle_month'],
            'total_active_employees'      => $activeEmployees->count(),
            'allocated_count'             => $allocatedCount,
            'skipped_probation_count'     => $skippedProbationCount,
            'skipped_already_allocated'   => $skippedAlreadyAllocatedCount,
            'logs'                        => $logs,
        ];
    }

    /**
     * Ensure a single employee is allocated for the current active cycle.
     * Supports delta top-ups if the admin increased an employee's custom quota mid-cycle.
     */
    public function ensureEmployeeAllocatedForCurrentCycle(User $user, ?Carbon $asOfDate = null): ?array
    {
        if ($user->status !== 'Active' || $user->hasRole('Super Admin') || strtolower($user->role ?? '') === 'super admin') {
            return null;
        }

        $d = $asOfDate ? $asOfDate->copy()->setTimezone('Asia/Kolkata') : Carbon::now('Asia/Kolkata');
        $cycleInfo = $this->getCycleInfo($d);
        $cycleKey  = $cycleInfo['cycle_key'];

        $eligibility = $this->isEmployeeEligibleForAutoAllocation($user, $d);
        if (!$eligibility['eligible']) {
            return null;
        }

        $settings  = $this->getSettings();
        $empPolicy = $user->employeeLeavePolicy ?? EmployeeLeavePolicy::where('user_id', $user->id)->first();

        $targetCL = ($empPolicy && $empPolicy->custom_monthly_cl !== null)
            ? (float) $empPolicy->custom_monthly_cl
            : (float) ($settings->default_monthly_cl ?? 1.0);

        $targetSL = ($empPolicy && $empPolicy->custom_monthly_sl !== null)
            ? (float) $empPolicy->custom_monthly_sl
            : (float) ($settings->default_monthly_sl ?? 1.0);

        // Check already allocated amounts for this cycle
        $existingCL = (float) LeaveAllocationLedger::where('user_id', $user->id)
            ->where('cycle_key', $cycleKey)
            ->where('transaction_type', 'automatic_allocation')
            ->where('leave_type', 'Casual Leave')
            ->sum('amount');

        $existingSL = (float) LeaveAllocationLedger::where('user_id', $user->id)
            ->where('cycle_key', $cycleKey)
            ->where('transaction_type', 'automatic_allocation')
            ->where('leave_type', 'Sick Leave')
            ->sum('amount');

        $hasAllocatedThisCycle = ($existingCL > 0 || $existingSL > 0);

        // If not allocated yet for this cycle, allocate full quota
        if (!$hasAllocatedThisCycle) {
            return DB::transaction(function () use ($user, $targetCL, $targetSL, $cycleKey, $cycleInfo) {
                $balance = LeaveBalance::firstOrCreate(
                    ['user_id' => $user->id],
                    ['casual_leave_balance' => 0, 'sick_leave_balance' => 0, 'cl_carry_forward' => 0]
                );

                $oldCL = (float) $balance->casual_leave_balance;
                $newCL = $oldCL + $targetCL;

                $oldSL = (float) $balance->sick_leave_balance;
                $newSL = $oldSL + $targetSL;

                LeaveAllocationLedger::create([
                    'user_id'          => $user->id,
                    'leave_type'       => 'Casual Leave',
                    'amount'           => $targetCL,
                    'transaction_type' => 'automatic_allocation',
                    'cycle_key'        => $cycleKey,
                    'opening_balance'  => $oldCL,
                    'closing_balance'  => $newCL,
                    'modified_by'      => null,
                    'remarks'          => "Automatic monthly allocation for cycle {$cycleInfo['cycle_month']} (+{$targetCL} CL)",
                ]);

                LeaveAllocationLedger::create([
                    'user_id'          => $user->id,
                    'leave_type'       => 'Sick Leave',
                    'amount'           => $targetSL,
                    'transaction_type' => 'automatic_allocation',
                    'cycle_key'        => $cycleKey,
                    'opening_balance'  => $oldSL,
                    'closing_balance'  => $newSL,
                    'modified_by'      => null,
                    'remarks'          => "Automatic monthly allocation for cycle {$cycleInfo['cycle_month']} (+{$targetSL} SL)",
                ]);

                $balance->casual_leave_balance = $newCL;
                $balance->sick_leave_balance   = $newSL;
                $balance->last_allocated_cycle = $cycleKey;
                $balance->save();

                return [
                    'user_id'   => $user->id,
                    'cl_amount' => $targetCL,
                    'sl_amount' => $targetSL,
                    'cycle_key' => $cycleKey,
                ];
            });
        }

        // If already allocated, check if target quota is higher (e.g. admin increased quota mid-cycle)
        $diffCL = $targetCL - $existingCL;
        $diffSL = $targetSL - $existingSL;

        if ($diffCL > 0 || $diffSL > 0) {
            return DB::transaction(function () use ($user, $diffCL, $diffSL, $cycleKey, $cycleInfo) {
                $balance = LeaveBalance::firstOrCreate(
                    ['user_id' => $user->id],
                    ['casual_leave_balance' => 0, 'sick_leave_balance' => 0, 'cl_carry_forward' => 0]
                );

                if ($diffCL > 0) {
                    $oldCL = (float) $balance->casual_leave_balance;
                    $newCL = $oldCL + $diffCL;
                    LeaveAllocationLedger::create([
                        'user_id'          => $user->id,
                        'leave_type'       => 'Casual Leave',
                        'amount'           => $diffCL,
                        'transaction_type' => 'automatic_allocation',
                        'cycle_key'        => $cycleKey,
                        'opening_balance'  => $oldCL,
                        'closing_balance'  => $newCL,
                        'modified_by'      => null,
                        'remarks'          => "Monthly quota adjustment top-up for cycle {$cycleInfo['cycle_month']} (+{$diffCL} CL)",
                    ]);
                    $balance->casual_leave_balance = $newCL;
                }

                if ($diffSL > 0) {
                    $oldSL = (float) $balance->sick_leave_balance;
                    $newSL = $oldSL + $diffSL;
                    LeaveAllocationLedger::create([
                        'user_id'          => $user->id,
                        'leave_type'       => 'Sick Leave',
                        'amount'           => $diffSL,
                        'transaction_type' => 'automatic_allocation',
                        'cycle_key'        => $cycleKey,
                        'opening_balance'  => $oldSL,
                        'closing_balance'  => $newSL,
                        'modified_by'      => null,
                        'remarks'          => "Monthly quota adjustment top-up for cycle {$cycleInfo['cycle_month']} (+{$diffSL} SL)",
                    ]);
                    $balance->sick_leave_balance = $newSL;
                }

                $balance->last_allocated_cycle = $cycleKey;
                $balance->save();

                return [
                    'user_id'        => $user->id,
                    'top_up_cl'      => max(0, $diffCL),
                    'top_up_sl'      => max(0, $diffSL),
                    'cycle_key'      => $cycleKey,
                ];
            });
        }

        return null;
    }

    /**
     * Record a manual leave balance adjustment by an Administrator.
     * Special Rule: If admin manually adds leave to an employee during probation,
     * that employee is treated as having completed/cleared probation for future automatic allocations.
     */
    public function recordManualAdjustment(User $admin, User $employee, array $data, ?string $remarks = null): LeaveBalance
    {
        return DB::transaction(function () use ($admin, $employee, $data, $remarks) {
            $balance = LeaveBalance::firstOrCreate(
                ['user_id' => $employee->id],
                ['casual_leave_balance' => 0, 'sick_leave_balance' => 0, 'cl_carry_forward' => 0]
            );

            $cycleInfo = $this->getCycleInfo();
            $cycleKey  = $cycleInfo['cycle_key'];

            // Check if employee was in probation
            $eligibility = $this->isEmployeeEligibleForAutoAllocation($employee);
            $wasInProbation = !$eligibility['eligible'];

            // If employee was in probation and admin is adjusting/adding leaves, automatically clear probation
            if ($wasInProbation) {
                $empPolicy = EmployeeLeavePolicy::firstOrCreate(
                    ['user_id' => $employee->id],
                    ['probation_cleared_manually' => false]
                );

                $empPolicy->probation_cleared_manually = true;
                $empPolicy->probation_cleared_at       = now();
                $empPolicy->probation_cleared_by       = $admin->id;
                $empPolicy->notes = ($empPolicy->notes ? $empPolicy->notes . "\n" : "") .
                    "[" . now()->toDateString() . "] Probation automatically cleared via manual leave allocation by " . trim($admin->first_name . ' ' . $admin->last_name);
                $empPolicy->save();

                $balance->probation_cleared_manually = true;

                // Log probation clearance transaction
                LeaveAllocationLedger::create([
                    'user_id'          => $employee->id,
                    'leave_type'       => 'Probation Clearance',
                    'amount'           => 0,
                    'transaction_type' => 'probation_clearance',
                    'cycle_key'        => $cycleKey,
                    'opening_balance'  => 0,
                    'closing_balance'  => 0,
                    'modified_by'      => $admin->id,
                    'remarks'          => 'Probation marked as cleared due to administrator leave addition. Eligible for future automatic allocations.',
                ]);
            }

            // 1. Casual Leave Adjustment
            if (isset($data['casual_leave_balance'])) {
                $oldCL = (float) $balance->casual_leave_balance;
                $newCL = (float) $data['casual_leave_balance'];
                $diffCL = $newCL - $oldCL;

                if ($diffCL != 0) {
                    LeaveAllocationLedger::create([
                        'user_id'          => $employee->id,
                        'leave_type'       => 'Casual Leave',
                        'amount'           => $diffCL,
                        'transaction_type' => 'manual_adjustment',
                        'cycle_key'        => $cycleKey,
                        'opening_balance'  => $oldCL,
                        'closing_balance'  => $newCL,
                        'modified_by'      => $admin->id,
                        'remarks'          => $remarks ?: "Manual adjustment by {$admin->first_name} {$admin->last_name}",
                    ]);
                    $balance->casual_leave_balance = $newCL;
                }
            }

            // 2. CL Carry-Forward Adjustment
            if (isset($data['cl_carry_forward'])) {
                $oldCF = (float) $balance->cl_carry_forward;
                $newCF = (float) $data['cl_carry_forward'];
                $diffCF = $newCF - $oldCF;

                if ($diffCF != 0) {
                    LeaveAllocationLedger::create([
                        'user_id'          => $employee->id,
                        'leave_type'       => 'CL Carry Forward',
                        'amount'           => $diffCF,
                        'transaction_type' => 'manual_adjustment',
                        'cycle_key'        => $cycleKey,
                        'opening_balance'  => $oldCF,
                        'closing_balance'  => $newCF,
                        'modified_by'      => $admin->id,
                        'carry_forward_year' => $data['cl_carry_forward_year'] ?? $balance->cl_carry_forward_year ?? now()->year,
                        'remarks'          => $remarks ?: "Manual carry-forward adjustment by {$admin->first_name} {$admin->last_name}",
                    ]);
                    $balance->cl_carry_forward = $newCF;
                    if (isset($data['cl_carry_forward_year'])) {
                        $balance->cl_carry_forward_year = (int) $data['cl_carry_forward_year'];
                    }
                }
            }

            // 3. Sick Leave Adjustment
            if (isset($data['sick_leave_balance'])) {
                $oldSL = (float) $balance->sick_leave_balance;
                $newSL = (float) $data['sick_leave_balance'];
                $diffSL = $newSL - $oldSL;

                if ($diffSL != 0) {
                    LeaveAllocationLedger::create([
                        'user_id'          => $employee->id,
                        'leave_type'       => 'Sick Leave',
                        'amount'           => $diffSL,
                        'transaction_type' => 'manual_adjustment',
                        'cycle_key'        => $cycleKey,
                        'opening_balance'  => $oldSL,
                        'closing_balance'  => $newSL,
                        'modified_by'      => $admin->id,
                        'remarks'          => $remarks ?: "Manual adjustment by {$admin->first_name} {$admin->last_name}",
                    ]);
                    $balance->sick_leave_balance = $newSL;
                }
            }

            $balance->save();
            return $balance->fresh();
        });
    }

    /**
     * Process Year-End Expiration:
     * - Sick Leave: No multi-year carry forward. All remaining unused SL expires at the annual cycle boundary.
     * - Casual Leave: Carry-forward permitted for 2 years. Carried forward CL older than 2 years expires.
     */
    public function processYearEndExpiration(?int $year = null, ?Carbon $asOfDate = null): array
    {
        $d = $asOfDate ? $asOfDate->copy()->setTimezone('Asia/Kolkata') : Carbon::now('Asia/Kolkata');
        $processYear = $year ?? $d->year;
        $cycleInfo   = $this->getCycleInfo($d);
        $cycleKey    = $cycleInfo['cycle_key'];

        $activeEmployees = User::where('status', 'Active')->with('leaveBalance')->get();
        $expiredSLCount = 0;
        $expiredCFCount = 0;
        $logs = [];

        foreach ($activeEmployees as $emp) {
            $balance = $emp->leaveBalance;
            if (!$balance) continue;

            DB::transaction(function () use ($emp, $balance, $processYear, $cycleKey, &$expiredSLCount, &$expiredCFCount, &$logs) {
                // 1. Sick Leave Expiration (Annual expiry, no carry-forward)
                if ($balance->sick_leave_balance > 0) {
                    $oldSL = (float) $balance->sick_leave_balance;
                    LeaveAllocationLedger::create([
                        'user_id'          => $emp->id,
                        'leave_type'       => 'Sick Leave',
                        'amount'           => -$oldSL,
                        'transaction_type' => 'expiration',
                        'cycle_key'        => $cycleKey,
                        'opening_balance'  => $oldSL,
                        'closing_balance'  => 0,
                        'modified_by'      => null,
                        'remarks'          => "Annual leave expiration: {$oldSL} unused Sick Leaves expired at leave-year end ({$processYear})",
                    ]);

                    $balance->sick_leave_balance = 0;
                    $expiredSLCount++;
                    $logs[] = "Expired {$oldSL} SL for {$emp->first_name} {$emp->last_name}";
                }

                // 2. Casual Leave Carry-Forward Expiration (after 2 years)
                if ($balance->cl_carry_forward > 0 
                    && $balance->cl_carry_forward_year !== null
                    && $balance->cl_carry_forward_year < ($processYear - 2)
                ) {
                    $oldCF = (float) $balance->cl_carry_forward;
                    LeaveAllocationLedger::create([
                        'user_id'          => $emp->id,
                        'leave_type'       => 'CL Carry Forward',
                        'amount'           => -$oldCF,
                        'transaction_type' => 'expiration',
                        'cycle_key'        => $cycleKey,
                        'opening_balance'  => $oldCF,
                        'closing_balance'  => 0,
                        'modified_by'      => null,
                        'carry_forward_year' => $balance->cl_carry_forward_year,
                        'remarks'          => "Carry-forward expiration: {$oldCF} CL from year {$balance->cl_carry_forward_year} expired (2-year limit reached)",
                    ]);

                    $balance->cl_carry_forward = 0;
                    $balance->cl_carry_forward_year = null;
                    $expiredCFCount++;
                    $logs[] = "Expired {$oldCF} carried forward CL for {$emp->first_name} {$emp->last_name}";
                }

                $balance->save();
            });
        }

        return [
            'status'            => 'success',
            'year'              => $processYear,
            'cycle_key'         => $cycleKey,
            'expired_sl_count'  => $expiredSLCount,
            'expired_cf_count'  => $expiredCFCount,
            'logs'              => $logs,
        ];
    }
}
