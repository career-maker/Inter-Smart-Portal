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
            $table->index('first_name');
            $table->index('last_name');
        });

        Schema::table('biometric_events', function (Blueprint $table) {
            $table->index('local_punch_time');
            $table->index(['user_id', 'local_punch_time']);
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
            $table->dropIndex(['first_name']);
            $table->dropIndex(['last_name']);
        });

        Schema::table('biometric_events', function (Blueprint $table) {
            $table->dropIndex(['local_punch_time']);
            $table->dropIndex(['user_id', 'local_punch_time']);
        });
    }
};
