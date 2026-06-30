<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\LeaveBalance;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ActivatePostProbationLeaves extends Command
{
    protected $signature   = 'leave:activate-post-probation';
    protected $description = 'Runs daily. Finds employees whose probation just ended and allocates prorated CL/SL for the remaining calendar months of the year.';

    public function handle(): int
    {
        $today       = Carbon::today();
        $currentYear = $today->year;
        $yearStart   = Carbon::create($currentYear, 1, 1);

        $this->info("Checking for newly post-probation employees on {$today->toDateString()}...");

        // Employees whose probation ended (probation_end_date <= today) and joined this year
        // (employees who joined before the current year already received Jan 1 allocation)
        $candidates = User::where('status', 'Active')
            ->whereNotNull('probation_end_date')
            ->where('probation_end_date', '<=', $today->toDateString())
            ->where('joining_date', '>=', $yearStart->toDateString())
            ->get();

        $count = 0;

        foreach ($candidates as $user) {
            try {
                $balance = LeaveBalance::where('user_id', $user->id)->first();

                // Skip if already activated (has non-zero balance this year)
                if ($balance && ($balance->casual_leave_balance > 0 || $balance->sick_leave_balance > 0)) {
                    continue;
                }

                // Calculate remaining months: months after probation_end_date month until Dec
                $probationEnd     = Carbon::parse($user->probation_end_date);
                $remainingMonths  = 12 - $probationEnd->month;

                if ($remainingMonths < 0) $remainingMonths = 0;

                if ($balance) {
                    $balance->casual_leave_balance = $remainingMonths;
                    $balance->sick_leave_balance   = $remainingMonths;
                    $balance->save();
                } else {
                    LeaveBalance::create([
                        'user_id'               => $user->id,
                        'casual_leave_balance'  => $remainingMonths,
                        'sick_leave_balance'    => $remainingMonths,
                        'cl_carry_forward'      => 0,
                        'total_leaves_taken'    => 0,
                    ]);
                }

                $count++;
                $this->line("  ✓ {$user->first_name} {$user->last_name}: probation ended {$probationEnd->toDateString()}, allocated CL={$remainingMonths} SL={$remainingMonths}");

            } catch (\Throwable $e) {
                Log::error("Post-probation activation failed for user {$user->id}: " . $e->getMessage());
                $this->error("  ✗ Failed for {$user->first_name} {$user->last_name}: " . $e->getMessage());
            }
        }

        // Also handle employees whose probation_end_date is null but joining_date was 6+ months ago
        $legacyCandidates = User::where('status', 'Active')
            ->whereNull('probation_end_date')
            ->whereNotNull('joining_date')
            ->where('joining_date', '>=', $yearStart->toDateString())
            ->get()
            ->filter(function ($user) use ($today) {
                $calculatedEnd = Carbon::parse($user->joining_date)->addMonths(6);
                return $calculatedEnd->lte($today);
            });

        foreach ($legacyCandidates as $user) {
            try {
                $balance = LeaveBalance::where('user_id', $user->id)->first();
                if ($balance && ($balance->casual_leave_balance > 0 || $balance->sick_leave_balance > 0)) {
                    continue;
                }

                $probationEnd    = Carbon::parse($user->joining_date)->addMonths(6);
                $remainingMonths = max(0, 12 - $probationEnd->month);

                if ($balance) {
                    $balance->casual_leave_balance = $remainingMonths;
                    $balance->sick_leave_balance   = $remainingMonths;
                    $balance->save();
                } else {
                    LeaveBalance::create([
                        'user_id'               => $user->id,
                        'casual_leave_balance'  => $remainingMonths,
                        'sick_leave_balance'    => $remainingMonths,
                        'cl_carry_forward'      => 0,
                        'total_leaves_taken'    => 0,
                    ]);
                }

                $count++;
                $this->line("  ✓ {$user->first_name} {$user->last_name}: computed probation end {$probationEnd->toDateString()}, allocated CL={$remainingMonths} SL={$remainingMonths}");

            } catch (\Throwable $e) {
                Log::error("Post-probation activation (legacy) failed for user {$user->id}: " . $e->getMessage());
            }
        }

        $this->info("Done. Activated {$count} employees.");
        return self::SUCCESS;
    }
}
