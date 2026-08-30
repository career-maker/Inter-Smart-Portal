<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add 'Cancelled' to the ENUM for status in leave_requests
        DB::statement("ALTER TABLE leave_requests MODIFY COLUMN status ENUM('Pending', 'Approved', 'Rejected', 'Cancelled') DEFAULT 'Pending'");
        
        // Add 'Cancelled' to the ENUM for status in wfh_requests
        DB::statement("ALTER TABLE wfh_requests MODIFY COLUMN status ENUM('Pending', 'Approved', 'Rejected', 'Cancelled') DEFAULT 'Pending'");
        
        // Add 'Cancelled' to the ENUM for status in ta_requests
        DB::statement("ALTER TABLE ta_requests MODIFY COLUMN status ENUM('Applied', 'Approved', 'Rejected', 'Paid', 'Unpaid', 'Cancelled') DEFAULT 'Applied'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE leave_requests MODIFY COLUMN status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending'");
        DB::statement("ALTER TABLE wfh_requests MODIFY COLUMN status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending'");
        DB::statement("ALTER TABLE ta_requests MODIFY COLUMN status ENUM('Applied', 'Approved', 'Rejected', 'Paid', 'Unpaid') DEFAULT 'Applied'");
    }
};
