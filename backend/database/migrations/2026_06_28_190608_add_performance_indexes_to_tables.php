<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->index('team_id');
            $table->index('status');
        });

        Schema::table('leave_requests', function (Blueprint $table) {
            $table->index('user_id');
            $table->index('status');
            $table->index('leave_date');
        });

        Schema::table('leave_balances', function (Blueprint $table) {
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['team_id']);
            $table->dropIndex(['status']);
        });

        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
            $table->dropIndex(['status']);
            $table->dropIndex(['leave_date']);
        });

        Schema::table('leave_balances', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
        });
    }
};
