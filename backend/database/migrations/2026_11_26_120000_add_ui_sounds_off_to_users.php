<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('users', 'ui_sounds_off')) {
            return;
        }
        Schema::table('users', function (Blueprint $table) {
            // Per-account choice to mute the UI click sounds (Recent theme); synced across devices.
            $table->boolean('ui_sounds_off')->default(false);
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'ui_sounds_off')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('ui_sounds_off');
            });
        }
    }
};
