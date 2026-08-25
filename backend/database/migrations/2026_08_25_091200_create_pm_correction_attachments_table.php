<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pm_correction_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('correction_id')->constrained('pm_corrections')->onDelete('cascade');
            $table->string('file_path');
            $table->string('file_name');
            $table->string('file_type')->nullable();
            $table->foreignId('uploaded_by')->constrained('users');
            $table->timestamp('created_at')->useCurrent();

            $table->index('correction_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pm_correction_attachments');
    }
};
