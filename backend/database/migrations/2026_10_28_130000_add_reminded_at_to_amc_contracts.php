<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Sales AMC expiry reminder: remember when the reminder went out so it is sent once per end date. Add-only nullable column. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('amc_contracts', function (Blueprint $table) {
            $table->timestamp('reminded_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('amc_contracts', function (Blueprint $table) {
            $table->dropColumn('reminded_at');
        });
    }
};
