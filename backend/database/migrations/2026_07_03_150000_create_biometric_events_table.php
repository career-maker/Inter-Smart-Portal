<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('biometric_events', function (Blueprint $table) {
            $table->id();
            
            // Source Identity
            $table->string('source_system');
            $table->string('source_table');
            $table->string('source_event_id');
            
            // Employee Mapping
            $table->string('employee_code');
            $table->unsignedBigInteger('user_id')->nullable();
            
            // Event Data
            $table->string('device_id');
            $table->enum('direction', ['in', 'out']);
            $table->timestamp('local_punch_time');
            $table->string('source_timezone');
            $table->timestamp('utc_punch_time');
            
            // Processing State
            $table->enum('mapping_status', ['unmapped', 'mapped'])->default('unmapped');
            $table->enum('processing_status', ['pending', 'processed', 'error', 'ignored'])->default('pending');
            $table->unsignedBigInteger('duplicate_reference')->nullable();
            $table->text('error_reason')->nullable();
            $table->timestamp('received_at')->useCurrent();
            
            $table->timestamps();

            // Constraints
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('duplicate_reference')->references('id')->on('biometric_events')->nullOnDelete();
            
            // Source event idempotency
            $table->unique(['source_system', 'source_table', 'source_event_id'], 'biometric_events_source_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('biometric_events');
    }
};
