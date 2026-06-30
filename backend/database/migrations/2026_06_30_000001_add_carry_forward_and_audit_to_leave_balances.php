<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add carry-forward tracking to leave_balances
        Schema::table('leave_balances', function (Blueprint $table) {
            $table->decimal('cl_carry_forward', 5, 1)->default(0)->after('casual_leave_balance');
            $table->integer('cl_carry_forward_year')->nullable()->after('cl_carry_forward');
        });

        // New audit log table for manual leave balance changes
        Schema::create('leave_balance_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('leave_type'); // 'casual' or 'sick'
            $table->decimal('previous_balance', 5, 1);
            $table->decimal('new_balance', 5, 1);
            $table->foreignId('modified_by')->constrained('users')->onDelete('cascade');
            $table->text('remarks')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_balance_audit_logs');
        Schema::table('leave_balances', function (Blueprint $table) {
            $table->dropColumn(['cl_carry_forward', 'cl_carry_forward_year']);
        });
    }
};
