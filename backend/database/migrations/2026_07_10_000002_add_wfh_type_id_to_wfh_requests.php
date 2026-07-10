<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wfh_requests', function (Blueprint $table) {
            // Add wfh_type_id if it doesn't exist
            if (!Schema::hasColumn('wfh_requests', 'wfh_type_id')) {
                $table->foreignId('wfh_type_id')
                    ->nullable()
                    ->constrained('leave_types')
                    ->onDelete('set null');
            }

            // Add attachment_link if it doesn't exist
            if (!Schema::hasColumn('wfh_requests', 'attachment_link')) {
                $table->string('attachment_link')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('wfh_requests', function (Blueprint $table) {
            if (Schema::hasColumn('wfh_requests', 'wfh_type_id')) {
                $table->dropForeignIdFor('leave_types', 'wfh_type_id');
                $table->dropColumn('wfh_type_id');
            }
            if (Schema::hasColumn('wfh_requests', 'attachment_link')) {
                $table->dropColumn('attachment_link');
            }
        });
    }
};
