<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ta_request_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ta_request_id')->constrained('ta_requests')->cascadeOnDelete();
            $table->string('category'); // e.g., 'Travel', 'Food', 'Accommodation', 'Other'
            $table->decimal('amount', 10, 2);
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index('ta_request_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ta_request_items');
    }
};
