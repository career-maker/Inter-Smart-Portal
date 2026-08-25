<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pm_correction_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('correction_id')->constrained('pm_corrections')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users');
            $table->text('comment');
            $table->timestamps();

            $table->index('correction_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pm_correction_comments');
    }
};
