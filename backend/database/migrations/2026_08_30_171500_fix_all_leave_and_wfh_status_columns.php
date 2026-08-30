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
        // Convert status, tl_status, and admin_status to VARCHAR or extended ENUM on leave_requests
        DB::statement("ALTER TABLE leave_requests MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Pending'");
        DB::statement("ALTER TABLE leave_requests MODIFY COLUMN tl_status VARCHAR(50) NOT NULL DEFAULT 'Pending'");
        DB::statement("ALTER TABLE leave_requests MODIFY COLUMN admin_status VARCHAR(50) NOT NULL DEFAULT 'Pending'");
        
        // Convert status, tl_status, and admin_status to VARCHAR or extended ENUM on wfh_requests
        DB::statement("ALTER TABLE wfh_requests MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Pending'");
        DB::statement("ALTER TABLE wfh_requests MODIFY COLUMN tl_status VARCHAR(50) NOT NULL DEFAULT 'Pending'");
        DB::statement("ALTER TABLE wfh_requests MODIFY COLUMN admin_status VARCHAR(50) NOT NULL DEFAULT 'Pending'");
        
        // Ensure ta_requests status supports Cancelled
        DB::statement("ALTER TABLE ta_requests MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Applied'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE leave_requests MODIFY COLUMN status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending'");
        DB::statement("ALTER TABLE leave_requests MODIFY COLUMN tl_status ENUM('Pending', 'Approved', 'Rejected', 'Not Required') DEFAULT 'Pending'");
        DB::statement("ALTER TABLE leave_requests MODIFY COLUMN admin_status ENUM('Pending', 'Approved', 'Rejected', 'Not Required') DEFAULT 'Pending'");
        
        DB::statement("ALTER TABLE wfh_requests MODIFY COLUMN status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending'");
        DB::statement("ALTER TABLE wfh_requests MODIFY COLUMN tl_status ENUM('Pending', 'Approved', 'Rejected', 'Not Required') DEFAULT 'Pending'");
        DB::statement("ALTER TABLE wfh_requests MODIFY COLUMN admin_status ENUM('Pending', 'Approved', 'Rejected', 'Not Required') DEFAULT 'Pending'");
        
        DB::statement("ALTER TABLE ta_requests MODIFY COLUMN status ENUM('Applied', 'Approved', 'Rejected', 'Paid', 'Unpaid') DEFAULT 'Applied'");
    }
};
