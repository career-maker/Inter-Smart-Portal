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
        // Add missing "Work From Home" (full day) leave type
        \App\Models\LeaveType::firstOrCreate(
            ['name' => 'Work From Home'],
            ['name' => 'Work From Home']
        );
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
