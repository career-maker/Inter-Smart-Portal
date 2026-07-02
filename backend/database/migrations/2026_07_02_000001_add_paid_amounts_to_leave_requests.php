<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            // Store the paid portion at submission time so approval can deduct correctly.
            // Existing rows default to 0 — they were handled by the old submit-time deduction.
            $table->float('paid_casual_leave')->default(0)->after('actual_leave_days');
            $table->float('paid_sick_leave')->default(0)->after('paid_casual_leave');
        });
    }

    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropColumn(['paid_casual_leave', 'paid_sick_leave']);
        });
    }
};
