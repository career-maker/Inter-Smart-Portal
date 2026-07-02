<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('leave_requests', 'lop_days')) {
            Schema::table('leave_requests', function (Blueprint $table) {
                $table->float('lop_days')->default(0)->after('paid_sick_leave');
            });
        }

        // Backfill existing data
        \DB::table('leave_requests')
            ->where('is_unpaid', true)
            ->where('lop_days', 0)
            ->update(['lop_days' => \DB::raw('actual_leave_days')]);
    }

    public function down(): void
    {
        if (Schema::hasColumn('leave_requests', 'lop_days')) {
            Schema::table('leave_requests', function (Blueprint $table) {
                $table->dropColumn('lop_days');
            });
        }
    }
};
