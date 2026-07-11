<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            // Track how much casual leave was paid from carry-forward
            if (!Schema::hasColumn('leave_requests', 'paid_cl_carry_forward')) {
                $table->float('paid_cl_carry_forward')->default(0)->after('paid_casual_leave');
            }
            if (!Schema::hasColumn('leave_requests', 'paid_cl_current_year')) {
                $table->float('paid_cl_current_year')->default(0)->after('paid_cl_carry_forward');
            }
        });
    }

    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropColumn(['paid_cl_carry_forward', 'paid_cl_current_year']);
        });
    }
};
