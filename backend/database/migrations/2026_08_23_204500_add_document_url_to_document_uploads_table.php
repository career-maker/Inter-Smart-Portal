<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_uploads', function (Blueprint $table) {
            if (!Schema::hasColumn('document_uploads', 'document_url')) {
                $table->string('document_url', 2048)->nullable()->after('file_path');
            }
        });
    }

    public function down(): void
    {
        Schema::table('document_uploads', function (Blueprint $table) {
            if (Schema::hasColumn('document_uploads', 'document_url')) {
                $table->dropColumn('document_url');
            }
        });
    }
};
