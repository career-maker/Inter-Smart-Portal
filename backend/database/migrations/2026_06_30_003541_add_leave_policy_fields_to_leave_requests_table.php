<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->boolean('is_unpaid')->default(false);
            $table->string('unpaid_reason')->nullable();
            $table->float('sandwich_leave_days')->default(0);
            $table->float('actual_leave_days')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropColumn([
                'is_unpaid',
                'unpaid_reason',
                'sandwich_leave_days',
                'actual_leave_days'
            ]);
        });
    }
};
