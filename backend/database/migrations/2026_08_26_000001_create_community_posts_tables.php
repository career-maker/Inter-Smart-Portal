<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('community_posts')) {
            Schema::create('community_posts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->text('content');
                $table->string('type')->default('post'); // post, praise, poll
                $table->string('media_url')->nullable();
                $table->unsignedInteger('likes_count')->default(0);
                $table->unsignedInteger('comments_count')->default(0);
                $table->boolean('pinned')->default(false);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('community_post_likes')) {
            Schema::create('community_post_likes', function (Blueprint $table) {
                $table->id();
                $table->foreignId('post_id')->constrained('community_posts')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->timestamps();
                $table->unique(['post_id', 'user_id']);
            });
        }

        if (!Schema::hasTable('community_post_comments')) {
            Schema::create('community_post_comments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('post_id')->constrained('community_posts')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->text('comment');
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('community_post_comments');
        Schema::dropIfExists('community_post_likes');
        Schema::dropIfExists('community_posts');
    }
};
