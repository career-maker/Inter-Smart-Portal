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
        if (Schema::hasTable('customization_settings')) {
            if (!Schema::hasColumn('customization_settings', 'welcome_banner_url')) {
                Schema::table('customization_settings', function (Blueprint $table) {
                    $table->longText('welcome_banner_url')->nullable()->default('/welcome-banner-bg.jpg');
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('customization_settings')) {
            if (Schema::hasColumn('customization_settings', 'welcome_banner_url')) {
                Schema::table('customization_settings', function (Blueprint $table) {
                    $table->dropColumn('welcome_banner_url');
                });
            }
        }
    }
};
