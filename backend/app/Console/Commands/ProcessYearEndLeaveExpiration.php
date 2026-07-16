<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\LeaveBalance;
use App\Models\LeaveAuditLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ProcessYearEndLeaveExpiration extends Command
{
    protected $signature   = 'leave:year-end-expiration {--year= : The year to process (default: current year)}';
    protected $description = 'Runs on Dec 31 each year: expires all unused SL and resets carry-forward older than 2 years.';

    public function handle(): int
    {
        $year = (int) ($this->option('year') ?? now()->year);

        $this->info("Processing year-end leave expiration for {$year}...");

        $activeUsers = User::where('status', 'Active')->get();
        $count = 0;

        foreach ($activeUsers as $user) {
            try {
                $balance = LeaveBalance::where('user_id', $user->id)->first();
                if (!$balance) {
                    continue;
                }

                $changes = [];

                // ── Sick Leave Expiration ──────────────────────────────────
                // All unused SL expires at year-end
                if ($balance->sick_leave_balance > 0) {
                    LeaveAuditLog::create([
                        'user_id' => $user->id,
                        'leave_type' => 'Sick Leave',
                        'previous_balance' => $balance->sick_leave_balance,
                        'new_balance' => 0,
                        'modified_by' => null,
                        'remarks' => "Year-end expiration: {$balance->sick_leave_balance} unused SL expired on Dec 31, {$year}",
                    ]);

                    $changes[] = "SL: {$balance->sick_leave_balance} → 0 (expired)";
                    $balance->sick_leave_balance = 0;
                }

                // ── Casual Leave Carry-Forward Cleanup ──────────────────────
                // If carry-forward is older than 2 years, expire it
                if ($balance->cl_carry_forward > 0
                    && $balance->cl_carry_forward_year !== null
                    && $balance->cl_carry_forward_year < $year - 2
                ) {
                    LeaveAuditLog::create([
                        'user_id' => $user->id,
                        'leave_type' => 'CL Carry Forward',
                        'previous_balance' => $balance->cl_carry_forward,
                        'new_balance' => 0,
                        'modified_by' => null,
                        'remarks' => "Carry-forward expiration: {$balance->cl_carry_forward} CL from {$balance->cl_carry_forward_year} expired (older than 2 years)",
                    ]);

                    $changes[] = "CF: {$balance->cl_carry_forward} → 0 (expired)";
                    $balance->cl_carry_forward = 0;
                    $balance->cl_carry_forward_year = null;
                }

                if (!empty($changes)) {
                    $balance->save();
                    $count++;
                    $this->line("  ✓ {$user->first_name} {$user->last_name}: " . implode(", ", $changes));
                }

            } catch (\Throwable $e) {
                Log::error("Year-end leave expiration failed for user {$user->id}: " . $e->getMessage());
                $this->error("  ✗ Failed for {$user->first_name} {$user->last_name}: " . $e->getMessage());
            }
        }

        $this->info("Done. Processed {$count} of {$activeUsers->count()} active employees.");

        return self::SUCCESS;
    }
}
