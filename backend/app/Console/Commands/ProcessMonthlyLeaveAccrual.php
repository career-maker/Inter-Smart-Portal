<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\LeaveBalance;
use App\Models\LeaveAuditLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ProcessMonthlyLeaveAccrual extends Command
{
    protected $signature   = 'leave:monthly-accrual';
    protected $description = 'Daily check: allocate 1 CL + 1 SL to employees on their monthly accrual anniversary (probation completion day + monthly).';

    public function handle(): int
    {
        $this->info("Processing monthly leave accrual...");

        $today = Carbon::today('Asia/Kolkata');
        $todayMonth = $today->month;
        $todayDay = $today->day;

        $activeUsers = User::where('status', 'Active')->get();
        $count = 0;

        foreach ($activeUsers as $user) {
            try {
                // Only process employees who have completed probation
                if ($user->isInProbation()) {
                    continue;
                }

                // Get probation end date
                $probationEnd = $user->probationEndDate();
                if (!$probationEnd) {
                    continue; // No probation end date set
                }

                $probationEndDate = Carbon::parse($probationEnd);
                $probationDay = $probationEndDate->day;
                $probationMonth = $probationEndDate->month;

                // Check if today is the monthly accrual anniversary
                // Account for months with fewer days (e.g., Feb 29 becomes Feb 28 in non-leap years)
                $isAnniversary = false;

                if ($todayDay === $probationDay && $todayMonth === $probationMonth) {
                    // Exact match (e.g., 29 Dec → 29 Dec)
                    $isAnniversary = true;
                } elseif ($probationDay > 28) {
                    // Probation ended on day 29-31
                    // Check if today is the last day of the month AND probation month matches
                    if ($today->isLastDayOfMonth() && $todayMonth === $probationMonth) {
                        $isAnniversary = true;
                    }
                    // Also check for the next month's probation day (e.g., 31 Jan → 1 Feb becomes 28/29 Feb)
                    elseif ($todayMonth === ($probationMonth % 12) + 1) {
                        $nextMonthDate = Carbon::parse($probationEnd)->addMonth();
                        if ($todayDay === $nextMonthDate->day && $today->month === $nextMonthDate->month) {
                            $isAnniversary = true;
                        }
                    }
                }

                if (!$isAnniversary) {
                    continue;
                }

                // Get or create leave balance
                $balance = LeaveBalance::firstOrCreate(
                    ['user_id' => $user->id],
                    ['casual_leave_balance' => 0, 'sick_leave_balance' => 0, 'cl_carry_forward' => 0]
                );

                $previousCLBalance = $balance->casual_leave_balance;
                $previousSLBalance = $balance->sick_leave_balance;

                // Allocate 1 CL + 1 SL
                $balance->casual_leave_balance += 1;
                $balance->sick_leave_balance += 1;

                // Log the accrual
                LeaveAuditLog::create([
                    'user_id' => $user->id,
                    'leave_type' => 'Casual Leave',
                    'previous_balance' => $previousCLBalance,
                    'new_balance' => $balance->casual_leave_balance,
                    'modified_by' => null, // System accrual
                    'remarks' => 'Monthly accrual: +1 CL on probation anniversary (' . $probationEnd . ')',
                ]);

                LeaveAuditLog::create([
                    'user_id' => $user->id,
                    'leave_type' => 'Sick Leave',
                    'previous_balance' => $previousSLBalance,
                    'new_balance' => $balance->sick_leave_balance,
                    'modified_by' => null, // System accrual
                    'remarks' => 'Monthly accrual: +1 SL on probation anniversary (' . $probationEnd . ')',
                ]);

                $balance->save();
                $count++;

                $this->line("  ✓ {$user->first_name} {$user->last_name}: +1 CL (now {$balance->casual_leave_balance}), +1 SL (now {$balance->sick_leave_balance})");

            } catch (\Throwable $e) {
                Log::error("Monthly leave accrual failed for user {$user->id}: " . $e->getMessage());
                $this->error("  ✗ Failed for {$user->first_name} {$user->last_name}: " . $e->getMessage());
            }
        }

        $this->info("Done. Processed {$count} accrual(s).");

        return self::SUCCESS;
    }
}
