<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_uploads', function (Blueprint $table) {
            // Make file_path nullable so URL-only fulfillments work
            $table->string('file_path')->nullable()->change();
            // New column for sharing document via URL instead of file upload
            $table->string('document_url', 2048)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('document_uploads', function (Blueprint $table) {
            $table->string('file_path')->nullable(false)->change();
            $table->dropColumn('document_url');
        });
    }
};
