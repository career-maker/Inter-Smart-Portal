<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\LeaveRequest;
use App\Models\WfhRequest;
use App\Models\User;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        try {
            // Identify all users without a team lead or without a team
            $users = User::all();
            $noTlUserIds = [];
            foreach ($users as $u) {
                if (!$u->hasTeamLead()) {
                    $noTlUserIds[] = $u->id;
                }
            }

            if (!empty($noTlUserIds)) {
                // Update pending leave requests from these users so they route directly to Admin
                LeaveRequest::whereIn('user_id', $noTlUserIds)
                    ->where('status', 'Pending')
                    ->where('tl_status', 'Pending')
                    ->update([
                        'tl_status' => 'Not Required',
                        'admin_status' => 'Pending',
                    ]);

                // Update pending WFH requests from these users so they route directly to Admin
                WfhRequest::whereIn('user_id', $noTlUserIds)
                    ->where('status', 'Pending')
                    ->where('tl_status', 'Pending')
                    ->update([
                        'tl_status' => 'Not Required',
                        'admin_status' => 'Pending',
                    ]);
            }
        } catch (\Throwable $e) {
            \Log::warning('update_pending_requests_without_team_lead migration notice: ' . $e->getMessage());
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
