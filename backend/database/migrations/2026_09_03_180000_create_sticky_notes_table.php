<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('sticky_notes')) {
            Schema::create('sticky_notes', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->string('title')->nullable();
                $table->longText('content')->nullable();
                $table->string('color', 30)->default('amber'); // amber, emerald, sky, rose, purple, slate
                $table->boolean('is_pinned')->default(false);
                $table->integer('order_index')->default(0);
                $table->timestamps();

                $table->index(['user_id', 'is_pinned']);
                $table->index(['user_id', 'order_index']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sticky_notes');
    }
};
