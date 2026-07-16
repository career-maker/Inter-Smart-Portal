<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\LeaveBalance;
use App\Models\LeaveAuditLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ProcessAnnualLeaveAllocation extends Command
{
    protected $signature   = 'leave:annual-allocation {--year= : The year to process (default: current year)}';
    protected $description = 'Legacy command: with monthly accrual policy, all employees get leaves via monthly accrual after probation. This command is kept for backward compatibility and logs that the new policy is in effect.';

    public function handle(): int
    {
        $year = (int) ($this->option('year') ?? now()->year);

        $this->info("Annual Leave Allocation Policy Update");
        $this->info("=====================================");
        $this->info("");
        $this->info("As of Jan 1, {$year}, the leave accrual system has changed:");
        $this->info("");
        $this->info("OLD POLICY (Legacy):");
        $this->info("  - Annual allocation: 12 CL + 12 SL on Jan 1");
        $this->info("");
        $this->info("NEW POLICY (Monthly Accrual):");
        $this->info("  - Employees earn 1 CL + 1 SL every month AFTER completing probation");
        $this->info("  - Accrual happens on the probation completion day each month");
        $this->info("  - Casual Leave: carries forward for up to 2 calendar years");
        $this->info("  - Sick Leave: expires every Dec 31 (no carry-forward)");
        $this->info("");
        $this->info("MIGRATION NOTES:");
        $this->info("  - Employees still in probation: no automatic allocation until probation ends");
        $this->info("  - Employees who completed probation: monthly accrual starts immediately");
        $this->info("  - Year-end processing (Dec 31): SL expires, old carry-forward cleaned up");
        $this->info("");
        $this->info("COMMAND FLOW:");
        $this->info("  - leave:monthly-accrual (daily at 00:10) — allocates monthly leaves");
        $this->info("  - leave:year-end-expiration (Dec 31 at 23:55) — expires SL, cleans up CF");
        $this->info("");
        $this->info("This command is kept for backward compatibility and reference only.");
        $this->info("No leave balances are modified by this command.");

        return self::SUCCESS;
    }
}
