<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Make file_path nullable via raw SQL (avoids doctrine/dbal dependency)
        DB::statement('ALTER TABLE document_uploads ALTER COLUMN file_path DROP NOT NULL');

        // Add document_url column only if it doesn't exist yet
        if (!Schema::hasColumn('document_uploads', 'document_url')) {
            Schema::table('document_uploads', function (Blueprint $table) {
                $table->string('document_url', 2048)->nullable();
            });
        }
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE document_uploads ALTER COLUMN file_path SET NOT NULL');

        if (Schema::hasColumn('document_uploads', 'document_url')) {
            Schema::table('document_uploads', function (Blueprint $table) {
                $table->dropColumn('document_url');
            });
        }
    }
};
