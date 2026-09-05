<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\Holiday;
use Illuminate\Support\Facades\Cache;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 2026-09-04 was erroneously added as a holiday but is a regular workday for InterSmart
        Holiday::where('date', '2026-09-04')->delete();
        Cache::forget('all_holidays');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
