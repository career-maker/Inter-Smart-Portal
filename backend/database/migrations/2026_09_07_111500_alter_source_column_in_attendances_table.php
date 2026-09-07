<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Modify the source column in attendances and attendance_breaks from enum to VARCHAR(50)
        // to support 'wfh_manual', 'manual', 'biometric', and any future sources without enum truncation errors.
        try {
            if (Schema::hasTable('attendances') && Schema::hasColumn('attendances', 'source')) {
                DB::statement("ALTER TABLE `attendances` MODIFY COLUMN `source` VARCHAR(50) NOT NULL DEFAULT 'manual'");
            }
        } catch (\Throwable $e) {
            \Log::warning('Failed altering attendances.source column: ' . $e->getMessage());
        }

        try {
            if (Schema::hasTable('attendance_breaks') && Schema::hasColumn('attendance_breaks', 'source')) {
                DB::statement("ALTER TABLE `attendance_breaks` MODIFY COLUMN `source` VARCHAR(50) NOT NULL DEFAULT 'manual'");
            }
        } catch (\Throwable $e) {
            \Log::warning('Failed altering attendance_breaks.source column: ' . $e->getMessage());
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        try {
            if (Schema::hasTable('attendances') && Schema::hasColumn('attendances', 'source')) {
                DB::statement("ALTER TABLE `attendances` MODIFY COLUMN `source` ENUM('manual', 'biometric', 'wfh_manual') NOT NULL DEFAULT 'manual'");
            }
        } catch (\Throwable $e) {}

        try {
            if (Schema::hasTable('attendance_breaks') && Schema::hasColumn('attendance_breaks', 'source')) {
                DB::statement("ALTER TABLE `attendance_breaks` MODIFY COLUMN `source` ENUM('manual', 'biometric', 'wfh_manual') NOT NULL DEFAULT 'manual'");
            }
        } catch (\Throwable $e) {}
    }
};
