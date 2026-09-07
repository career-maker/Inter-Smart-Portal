<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\Attendance;
use Carbon\Carbon;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        try {
            // Find manual or wfh_manual attendance records where check_in_time was stored in IST instead of UTC
            $attendances = Attendance::whereIn('source', ['manual', 'wfh_manual'])
                ->whereNotNull('check_in_time')
                ->get();

            foreach ($attendances as $att) {
                $rawCheckIn = Carbon::parse($att->getRawOriginal('check_in_time'), 'UTC');
                $createdAt  = Carbon::parse($att->created_at, 'UTC');

                // If check_in_time was saved as IST, it is ~330 minutes (5.5h) ahead of createdAt (which is in UTC)
                if (abs($rawCheckIn->diffInMinutes($createdAt) - 330) < 20) {
                    $att->check_in_time = $createdAt;
                    if ($att->check_out_time) {
                        $att->check_out_time = Carbon::parse($att->getRawOriginal('check_out_time'), 'UTC')->subMinutes(330);
                    }
                    if ($att->last_out) {
                        $att->last_out = Carbon::parse($att->getRawOriginal('last_out'), 'UTC')->subMinutes(330);
                    }
                    $att->save();
                }
            }
        } catch (\Throwable $e) {
            \Log::warning('fix_wfh_manual_attendance_timezones migration notice: ' . $e->getMessage());
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
