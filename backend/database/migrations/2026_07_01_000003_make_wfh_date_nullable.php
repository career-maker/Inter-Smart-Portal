<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wfh_requests', function (Blueprint $table) {
            // wfh_date was NOT NULL with no default — new records use start_date/end_date instead
            $table->date('wfh_date')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('wfh_requests', function (Blueprint $table) {
            $table->date('wfh_date')->nullable(false)->change();
        });
    }
};
