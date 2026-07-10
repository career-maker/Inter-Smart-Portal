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
        $today       = Carbon::today('Asia/Kolkata');
        $currentYear = $today->year;

        $this->info("Checking for newly post-probation employees on {$today->toDateString()}...");

        // Candidates: Active users with probation_end_date <= today OR legacy users with joining_date <= today - 6 months
        $candidates = User::where('status', 'Active')
            ->where(function ($q) use ($today) {
                $q->where(function ($query) use ($today) {
                    $query->whereNotNull('probation_end_date')
                          ->where('probation_end_date', '<=', $today->toDateString());
                })
                ->orWhere(function ($query) use ($today) {
                    $query->whereNull('probation_end_date')
                          ->whereNotNull('joining_date')
                          ->where('joining_date', '<=', $today->copy()->subMonths(6)->toDateString());
                });
            })
            ->get();

        $count = 0;

        foreach ($candidates as $user) {
            try {
                // Fetch or create the leave balance record
                $balance = LeaveBalance::firstOrCreate(
                    ['user_id' => $user->id],
                    [
                        'casual_leave_balance'       => 0,
                        'sick_leave_balance'         => 0,
                        'cl_carry_forward'           => 0,
                        'total_leaves_taken'         => 0,
                        'probation_leaves_allocated' => false
                    ]
                );

                // Skip if already allocated
                if ($balance->probation_leaves_allocated) {
                    continue;
                }

                // Determine probation end date for logging
                $probationEnd = $user->probation_end_date 
                    ? Carbon::parse($user->probation_end_date) 
                    : Carbon::parse($user->joining_date)->addMonths(6);

                // Allocate exactly 12 Casual Leaves and 12 Sick Leaves, taking into account any manually added leaves
                $currentCL = (float) $balance->casual_leave_balance;
                $currentSL = (float) $balance->sick_leave_balance;

                $addCL = max(0.0, 12.0 - $currentCL);
                $addSL = max(0.0, 12.0 - $currentSL);

                $newCL = $currentCL + $addCL;
                $newSL = $currentSL + $addSL;

                $balance->casual_leave_balance = $newCL;
                $balance->sick_leave_balance   = $newSL;
                $balance->probation_leaves_allocated = true;
                $balance->save();

                // Create audit logs if any leaves were added
                if ($addCL > 0) {
                    \App\Models\LeaveBalanceAuditLog::create([
                        'user_id'          => $user->id,
                        'leave_type'       => 'Casual Leave',
                        'previous_balance' => $currentCL,
                        'new_balance'      => $newCL,
                        'modified_by'      => $user->id, // System/Self modification
                        'remarks'          => 'Automatic allocation after probation period',
                    ]);
                }
                if ($addSL > 0) {
                    \App\Models\LeaveBalanceAuditLog::create([
                        'user_id'          => $user->id,
                        'leave_type'       => 'Sick Leave',
                        'previous_balance' => $currentSL,
                        'new_balance'      => $newSL,
                        'modified_by'      => $user->id, // System/Self modification
                        'remarks'          => 'Automatic allocation after probation period',
                    ]);
                }

                $count++;
                $this->line("  ✓ {$user->first_name} {$user->last_name}: probation ended {$probationEnd->toDateString()}. Allocated CL Add: {$addCL} (Total: {$newCL}), SL Add: {$addSL} (Total: {$newSL})");

            } catch (\Throwable $e) {
                Log::error("Post-probation activation failed for user {$user->id}: " . $e->getMessage());
                $this->error("  ✗ Failed for {$user->first_name} {$user->last_name}: " . $e->getMessage());
            }
        }

        $this->info("Done. Activated {$count} employees.");
        return self::SUCCESS;
    }
}
