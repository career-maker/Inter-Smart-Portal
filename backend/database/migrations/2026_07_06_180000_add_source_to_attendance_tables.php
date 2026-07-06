<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->enum('source', ['manual', 'biometric'])->default('manual')->after('status');
        });

        Schema::table('attendance_breaks', function (Blueprint $table) {
            $table->enum('source', ['manual', 'biometric'])->default('manual')->after('break_type');
        });
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropColumn('source');
        });

        Schema::table('attendance_breaks', function (Blueprint $table) {
            $table->dropColumn('source');
        });
    }
};
