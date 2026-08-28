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
        Schema::table('pm_projects', function (Blueprint $table) {
            $table->boolean('is_live')->default(false)->after('status');
            $table->date('live_date')->nullable()->after('is_live');
            $table->text('live_notes')->nullable()->after('live_date');
            $table->foreignId('live_marked_by')->nullable()->after('live_notes')->constrained('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pm_projects', function (Blueprint $table) {
            $table->dropForeign(['live_marked_by']);
            $table->dropColumn(['is_live', 'live_date', 'live_notes', 'live_marked_by']);
        });
    }
};
