<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->date('date');
            $table->timestamp('check_in_time')->nullable();
            $table->timestamp('check_out_time')->nullable();
            $table->integer('total_working_minutes')->nullable();
            $table->enum('status', ['Present', 'Absent', 'Late', 'Half Day'])->default('Present');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'date']); // One record per day per user
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
