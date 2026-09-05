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
        if (!Schema::hasColumn('users', 'is_emergency_contact')) {
            Schema::table('users', function (Blueprint $table) {
                $table->boolean('is_emergency_contact')->default(false)->after('status')->index();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('users', 'is_emergency_contact')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('is_emergency_contact');
            });
        }
    }
};
