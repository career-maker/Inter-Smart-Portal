<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            // Add approval workflow columns if they don't exist
            if (!Schema::hasColumn('leave_requests', 'tl_status')) {
                $table->string('tl_status')->default('Pending')->after('status');
            }
            if (!Schema::hasColumn('leave_requests', 'admin_status')) {
                $table->string('admin_status')->default('Pending')->after('tl_status');
            }
            if (!Schema::hasColumn('leave_requests', 'approver_id')) {
                $table->unsignedBigInteger('approver_id')->nullable()->after('approved_by');
            }
        });
    }

    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            if (Schema::hasColumn('leave_requests', 'tl_status')) {
                $table->dropColumn('tl_status');
            }
            if (Schema::hasColumn('leave_requests', 'admin_status')) {
                $table->dropColumn('admin_status');
            }
            if (Schema::hasColumn('leave_requests', 'approver_id')) {
                $table->dropColumn('approver_id');
            }
        });
    }
};
