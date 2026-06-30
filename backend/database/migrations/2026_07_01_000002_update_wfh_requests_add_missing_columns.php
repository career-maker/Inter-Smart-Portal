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
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();

            // Approval workflow columns
            $table->string('tl_status')->default('Pending');
            $table->string('admin_status')->default('Pending');
            $table->text('remarks')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('wfh_requests', function (Blueprint $table) {
            $table->dropColumn(['start_date', 'end_date', 'tl_status', 'admin_status', 'remarks']);
        });
    }
};
