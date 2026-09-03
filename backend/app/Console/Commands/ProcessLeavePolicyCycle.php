<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\LeavePolicyEngine;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ProcessLeavePolicyCycle extends Command
{
    protected $signature = 'leave:process-policy-cycle 
                            {--force : Force execution even if already run for this cycle}
                            {--date= : Custom evaluation date (YYYY-MM-DD)}
                            {--expire-year-end : Force year-end expiration pass}';

    protected $description = 'Evaluates leave policy cycle boundaries, executes automatic monthly CL/SL allocation, and processes leave expirations dynamically.';

    public function handle(LeavePolicyEngine $engine): int
    {
        $dateStr = $this->option('date');
        $asOfDate = $dateStr ? Carbon::parse($dateStr, 'Asia/Kolkata') : Carbon::now('Asia/Kolkata');
        $force = (bool) $this->option('force');

        $this->info("Evaluating Leave Policy Cycle for {$asOfDate->toDateString()}...");

        $cycleInfo = $engine->getCycleInfo($asOfDate);
        $this->table(
            ['Property', 'Value'],
            [
                ['Configured Start Day', $cycleInfo['start_day']],
                ['Cycle Key', $cycleInfo['cycle_key']],
                ['Cycle Month', $cycleInfo['cycle_month']],
                ['Cycle Start Date', $cycleInfo['cycle_start_date']],
                ['Cycle End Date', $cycleInfo['cycle_end_date']],
                ['Is Cycle Start Day', $cycleInfo['is_cycle_start_day'] ? 'YES' : 'NO'],
            ]
        );

        // Run monthly allocation for the active cycle.
        // Idempotency: any employee already allocated for cycle_key is skipped automatically.
        // Running on every execution ensures newly eligible or unallocated employees are never missed.
        $this->info("Evaluating Monthly CL & SL Allocation for cycle [{$cycleInfo['cycle_key']}]...");
        $allocResult = $engine->processMonthlyCycleAllocation($asOfDate, $force);

        $this->line("  ✓ Total Active Employees: {$allocResult['total_active_employees']}");
        $this->line("  ✓ Allocated: {$allocResult['allocated_count']}");
        $this->line("  ✓ Skipped (In Probation): {$allocResult['skipped_probation_count']}");
        $this->line("  ✓ Skipped (Already Processed): {$allocResult['skipped_already_allocated']}");

        foreach ($allocResult['logs'] as $log) {
            $this->line("    • {$log}");
        }

        // Year-end expiration check (Runs if December cycle boundary or explicit flag)
        $isYearEndBoundary = ($asOfDate->month === 12 && $cycleInfo['is_cycle_start_day']) || $this->option('expire-year-end');
        if ($isYearEndBoundary) {
            $this->info("Processing Year-End Expiration for year {$asOfDate->year}...");
            $expResult = $engine->processYearEndExpiration($asOfDate->year, $asOfDate);

            $this->line("  ✓ Expired Sick Leave count: {$expResult['expired_sl_count']}");
            $this->line("  ✓ Expired 2-Year CL Carry Forward count: {$expResult['expired_cf_count']}");
            foreach ($expResult['logs'] as $log) {
                $this->line("    • {$log}");
            }
        }

        $this->info("Leave policy cycle processing completed successfully.");
        return self::SUCCESS;
    }
}
