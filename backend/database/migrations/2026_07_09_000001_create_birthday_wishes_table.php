<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('birthday_wishes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('birthday_user_id');
            $table->unsignedBigInteger('sender_id');
            $table->text('message');
            $table->timestamps();

            // Indexes
            $table->index('birthday_user_id');
            $table->index('sender_id');

            // Prevent duplicate wishes from same person to same person
            $table->unique(['birthday_user_id', 'sender_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('birthday_wishes');
    }
};
