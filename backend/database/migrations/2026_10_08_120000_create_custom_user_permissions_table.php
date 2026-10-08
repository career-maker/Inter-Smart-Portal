<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('custom_user_permissions')) {
            Schema::create('custom_user_permissions', function (Blueprint $table) {
                $table->id();
                $table->string('permission_key', 100)->index();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->timestamps();

                $table->unique(['permission_key', 'user_id'], 'uniq_perm_user');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('custom_user_permissions');
    }
};
