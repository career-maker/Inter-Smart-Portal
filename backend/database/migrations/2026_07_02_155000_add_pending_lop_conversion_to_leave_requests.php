<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('leave_requests', 'pending_lop_conversion')) {
                $table->boolean('pending_lop_conversion')->default(false)->after('lop_days');
            }
            if (!Schema::hasColumn('leave_requests', 'lop_conversion_source_id')) {
                $table->unsignedBigInteger('lop_conversion_source_id')->nullable()->after('pending_lop_conversion');
            }
        });
    }

    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropColumn(['pending_lop_conversion', 'lop_conversion_source_id']);
        });
    }
};
