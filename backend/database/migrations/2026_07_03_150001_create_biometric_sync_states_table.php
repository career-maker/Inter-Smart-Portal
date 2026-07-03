<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('biometric_sync_states', function (Blueprint $table) {
            $table->id();
            
            $table->string('source_system');
            $table->string('source_table');
            
            $table->timestamp('last_successful_sync')->nullable();
            $table->timestamp('last_attempted_sync')->nullable();
            
            $table->enum('sync_status', ['idle', 'running', 'error'])->default('idle');
            $table->text('last_error')->nullable();
            
            $table->timestamps();

            // Unique constraint
            $table->unique(['source_system', 'source_table'], 'biometric_sync_states_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('biometric_sync_states');
    }
};
