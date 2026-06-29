<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('leave_request_id')->constrained('leave_requests')->onDelete('cascade');
            $table->foreignId('modified_by')->constrained('users')->onDelete('cascade');
            $table->json('previous_value')->nullable();
            $table->json('new_value')->nullable();
            $table->string('remarks')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_audit_logs');
    }
};
