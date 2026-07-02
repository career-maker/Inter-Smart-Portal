<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wfh_requests', function (Blueprint $table) {
            // Add start/end date range columns (replacing single wfh_date)
            if (!Schema::hasColumn('wfh_requests', 'start_date')) {
                $table->date('start_date')->nullable();
            }
            if (!Schema::hasColumn('wfh_requests', 'end_date')) {
                $table->date('end_date')->nullable();
            }

            // Approval workflow columns
            if (!Schema::hasColumn('wfh_requests', 'tl_status')) {
                $table->string('tl_status')->default('Pending');
            }
            if (!Schema::hasColumn('wfh_requests', 'admin_status')) {
                $table->string('admin_status')->default('Pending');
            }
            if (!Schema::hasColumn('wfh_requests', 'remarks')) {
                $table->text('remarks')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('wfh_requests', function (Blueprint $table) {
            $columnsToDrop = [];
            foreach (['start_date', 'end_date', 'tl_status', 'admin_status', 'remarks'] as $col) {
                if (Schema::hasColumn('wfh_requests', $col)) {
                    $columnsToDrop[] = $col;
                }
            }
            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
