<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Sales budget is a real value in INR or AED. budget_cap is NOT money: it is the max person-days (8h each) split across departments. Add-only. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_intake', function (Blueprint $table) {
            $table->string('currency', 3)->default('INR')->after('budget');
        });
    }

    public function down(): void
    {
        Schema::table('project_intake', function (Blueprint $table) {
            $table->dropColumn('currency');
        });
    }
};
