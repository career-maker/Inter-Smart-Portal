<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->string('attachment_link', 2048)->nullable()->after('description');
        });

        Schema::table('leave_requests', function (Blueprint $table) {
            $table->string('attachment_link', 2048)->nullable()->after('reason');
        });
    }

    public function down(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->dropColumn('attachment_link');
        });
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropColumn('attachment_link');
        });
    }
};
