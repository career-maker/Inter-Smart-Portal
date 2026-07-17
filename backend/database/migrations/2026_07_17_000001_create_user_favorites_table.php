<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_favorites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('page_href'); // e.g., "/leaves", "/employees"
            $table->string('page_label'); // e.g., "My Leaves", "Employees"
            $table->timestamps();

            // Ensure each user can only favorite a page once
            $table->unique(['user_id', 'page_href']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_favorites');
    }
};
