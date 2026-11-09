<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('conversation_participants') && !Schema::hasColumn('conversation_participants', 'role')) {
            Schema::table('conversation_participants', function (Blueprint $table) {
                // 'admin' or 'member'. Only meaningful for group conversations.
                $table->string('role', 20)->default('member')->after('user_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('conversation_participants', 'role')) {
            Schema::table('conversation_participants', function (Blueprint $table) {
                $table->dropColumn('role');
            });
        }
    }
};
