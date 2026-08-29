<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ta_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('ta_requests', 'receipt_number')) {
                $table->string('receipt_number', 50)->nullable()->after('approval_notes');
            }
            if (!Schema::hasColumn('ta_requests', 'approved_amount')) {
                $table->decimal('approved_amount', 10, 2)->nullable()->after('total_amount');
            }
            if (!Schema::hasColumn('ta_requests', 'payment_receipt_link')) {
                $table->string('payment_receipt_link', 500)->nullable()->after('receipt_number');
            }
            if (!Schema::hasColumn('ta_requests', 'payment_mode')) {
                $table->string('payment_mode', 50)->nullable()->after('payment_receipt_link');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ta_requests', function (Blueprint $table) {
            $table->dropColumn(['receipt_number', 'approved_amount', 'payment_receipt_link', 'payment_mode']);
        });
    }
};
