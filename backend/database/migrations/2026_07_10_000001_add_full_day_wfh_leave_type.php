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
        // Add missing "Work From Home" (full day) leave type via direct insert
        \Illuminate\Support\Facades\DB::table('leave_types')->insertOrIgnore([
            'name' => 'Work From Home',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove the leave type if rolled back
        \App\Models\LeaveType::where('name', 'Work From Home')->delete();
    }
};
