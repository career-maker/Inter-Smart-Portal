<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Services\BiometricProcessorService;

class RepairProductionDataSeeder extends Seeder
{
    /**
     * Repair issues discovered in production audit:
     * ISSUE 1: Employee 272 orphaned events not recovered
     * ISSUE 2: Employee 231 stale checkout on current day
     */
    public function run(): void
    {
        $processor = app(BiometricProcessorService::class);

        echo "\n========== PRODUCTION REPAIR ==========\n";

        // ISSUE 1: Employee 272 Orphaned Event Recovery
        echo "\n[ISSUE 1] Recovering orphaned events for employee_code=272...\n";

        $recovery = $processor->recoverOrphanedEventsForEmployeeCode('272');
        if (is_array($recovery) && !empty($recovery)) {
            $processed = $recovery['processed'] ?? 0;
            $errors = $recovery['errors'] ?? 0;
            echo "Processed: $processed events\n";
            echo "Errors: $errors events\n";
        } else {
            echo "Recovery returned: " . json_encode($recovery) . "\n";
        }

        // ISSUE 2: Employee 231 Reprocess July 8 timeline
        echo "\n[ISSUE 2] Reprocessing employee_code=231 July 8 timeline...\n";

        $employee231 = User::where('employee_code', '231')->first();
        if ($employee231) {
            // Fetch ALL July 8 events for employee 231
            $events = \App\Models\BiometricEvent::where('user_id', $employee231->id)
                ->whereDate('local_punch_time', '2026-07-08')
                ->pluck('id')
                ->toArray();

            if (!empty($events)) {
                $results = $processor->processEvents($events);
                echo "Reprocessed: {$results['processed']} events\n";
                echo "Errors: {$results['errors']} events\n";

                // Verify final state
                $attendance = \App\Models\Attendance::where('user_id', $employee231->id)
                    ->where('date', '2026-07-08')
                    ->where('source', 'biometric')
                    ->first();

                if ($attendance) {
                    echo "Attendance state: check_in={$attendance->check_in_time}, check_out={$attendance->check_out_time}\n";
                    if ($attendance->check_out_time === null) {
                        echo "✓ Status: Employee is currently working (check_out_time is NULL)\n";
                    } else {
                        echo "✗ Status: Employee appears checked out (check_out_time is set)\n";
                    }
                }
            } else {
                echo "No events found for employee 231 on 2026-07-08\n";
            }
        } else {
            echo "Employee with employee_code=231 not found\n";
        }

        echo "\n========== REPAIR COMPLETE ==========\n";
    }
}
