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
            $table->date('end_date')->after('start_date')->nullable();
            $table->decimal('days', 4, 1)->after('end_date')->default(1);
            $table->dropColumn('duration_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->enum('duration_type', ['Full', 'Half-Morning', 'Half-Afternoon'])->default('Full');
            $table->dropColumn('days');
            $table->dropColumn('end_date');
            $table->renameColumn('start_date', 'leave_date');
        });
    }
};
