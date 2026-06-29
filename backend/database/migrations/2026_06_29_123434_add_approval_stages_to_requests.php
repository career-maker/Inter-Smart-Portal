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
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->enum('tl_status', ['Pending', 'Approved', 'Rejected', 'Not Required'])->default('Pending')->after('status');
            $table->enum('admin_status', ['Pending', 'Approved', 'Rejected', 'Not Required'])->default('Pending')->after('tl_status');
        });

        Schema::table('wfh_requests', function (Blueprint $table) {
            $table->enum('tl_status', ['Pending', 'Approved', 'Rejected', 'Not Required'])->default('Pending')->after('status');
            $table->enum('admin_status', ['Pending', 'Approved', 'Rejected', 'Not Required'])->default('Pending')->after('tl_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropColumn(['tl_status', 'admin_status']);
        });

        Schema::table('wfh_requests', function (Blueprint $table) {
            $table->dropColumn(['tl_status', 'admin_status']);
        });
    }
};
