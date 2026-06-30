<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\LeaveBalance;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ProcessAnnualLeaveAllocation extends Command
{
    protected $signature   = 'leave:annual-allocation {--year= : The year to process (default: current year)}';
    protected $description = 'Runs on Jan 1 each year: allocates 12 CL, carries forward unused CL, and resets SL to 12 for all active employees.';

    public function handle(): int
    {
        $year      = (int) ($this->option('year') ?? now()->year);
        $prevYear  = $year - 1;

        $this->info("Processing annual leave allocation for {$year}...");

        $activeUsers = User::where('status', 'Active')->get();
        $count       = 0;

        foreach ($activeUsers as $user) {
            try {
                $balance = LeaveBalance::firstOrCreate(
                    ['user_id' => $user->id],
                    ['casual_leave_balance' => 0, 'sick_leave_balance' => 0, 'cl_carry_forward' => 0]
                );

                // ── Casual Leave ──────────────────────────────────────────
                // 1. Any old carry-forward (from 2 years ago) expires — do NOT re-carry it.
                //    We track carry-forward year; if it is older than prevYear, reset to 0.
                $expiredCF = 0;
                if ($balance->cl_carry_forward > 0
                    && $balance->cl_carry_forward_year !== null
                    && $balance->cl_carry_forward_year < $prevYear
                ) {
                    $expiredCF = $balance->cl_carry_forward;
                    $balance->cl_carry_forward      = 0;
                    $balance->cl_carry_forward_year = null;
                }

                // 2. Current year's unused CL becomes the new carry-forward (only if prev CF year matches prevYear OR there was no carry-forward)
                $newCarryForward = $balance->casual_leave_balance; // whatever remains from last year

                // 3. New year: 12 CL allocated fresh
                $balance->casual_leave_balance  = 12;
                $balance->cl_carry_forward      = $newCarryForward;
                $balance->cl_carry_forward_year = $prevYear; // marks these as from prevYear

                // ── Sick Leave ────────────────────────────────────────────
                // All unused SL expires; reset to 12
                $balance->sick_leave_balance = 12;

                $balance->save();
                $count++;

                $this->line("  ✓ {$user->first_name} {$user->last_name}: CL=12 + CF={$newCarryForward}, SL=12" .
                    ($expiredCF > 0 ? " (expired CF: {$expiredCF})" : ""));

            } catch (\Throwable $e) {
                Log::error("Annual leave allocation failed for user {$user->id}: " . $e->getMessage());
                $this->error("  ✗ Failed for {$user->first_name} {$user->last_name}: " . $e->getMessage());
            }
        }

        $this->info("Done. Processed {$count} of {$activeUsers->count()} active employees.");

        return self::SUCCESS;
    }
}
