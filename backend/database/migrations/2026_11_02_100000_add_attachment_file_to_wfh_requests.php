<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wfh_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('wfh_requests', 'attachment_path')) {
                $table->string('attachment_path')->nullable();
                $table->string('attachment_name')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('wfh_requests', function (Blueprint $table) {
            $table->dropColumn(['attachment_path', 'attachment_name']);
        });
    }
};
