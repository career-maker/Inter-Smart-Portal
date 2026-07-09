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
            $table->unsignedBigInteger('birthday_user_id')->index(); // Person whose birthday it is
            $table->unsignedBigInteger('sender_id')->index(); // Person sending the wish
            $table->text('message'); // Custom wish message
            $table->timestamp('wished_at')->useCurrent(); // When the wish was sent
            $table->timestamps();

            // Foreign keys
            $table->foreign('birthday_user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('sender_id')->references('id')->on('users')->onDelete('cascade');

            // Prevent duplicate wishes from same person
            $table->unique(['birthday_user_id', 'sender_id'], 'unique_wish_per_sender');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('birthday_wishes');
    }
};
