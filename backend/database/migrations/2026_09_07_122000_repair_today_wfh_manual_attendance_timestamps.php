<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        try {
            // Find any attendance record for 2026-09-07 where check_in_time was stored with IST offset (raw hour >= 10 on date 2026-09-07)
            $records = DB::table('attendances')
                ->where('date', '2026-09-07')
                ->whereNotNull('check_in_time')
                ->get();

            foreach ($records as $record) {
                $rawCheckIn = Carbon::parse($record->check_in_time, 'UTC');
                // Check-in at 11:xx AM IST was saved as 11:xx UTC (hour >= 10 in UTC column)
                // True UTC for morning IST is 03:xx to 06:xx.
                if ($rawCheckIn->hour >= 10) {
                    $newCheckIn = $rawCheckIn->copy()->subMinutes(330);
                    $newCheckOut = null;
                    if ($record->check_out_time) {
                        $rawCheckOut = Carbon::parse($record->check_out_time, 'UTC');
                        if ($rawCheckOut->hour >= 10) {
                            $newCheckOut = $rawCheckOut->copy()->subMinutes(330);
                        }
                    }

                    $updateData = [
                        'check_in_time' => $newCheckIn->format('Y-m-d H:i:s'),
                    ];
                    if ($newCheckOut) {
                        $updateData['check_out_time'] = $newCheckOut->format('Y-m-d H:i:s');
                    }

                    DB::table('attendances')
                        ->where('id', $record->id)
                        ->update($updateData);
                }
            }
        } catch (\Throwable $e) {
            \Log::warning('repair_today_wfh_manual_attendance_timestamps migration error: ' . $e->getMessage());
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
