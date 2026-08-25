<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Project Management module — pm_settings.
     * Dedicated key-value store, deliberately separate from the existing
     * generic `system_settings` table (which is hardcoded Super-Admin-only
     * at the route level and used for unrelated HR config) so PM's access
     * control never needs to touch HR's settings route/controller.
     */
    public function up(): void
    {
        Schema::create('pm_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pm_settings');
    }
};
