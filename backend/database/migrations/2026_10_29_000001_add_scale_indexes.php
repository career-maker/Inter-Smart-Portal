<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // "who is online" scans tokens by last_used_at on every chat list / heartbeat call
        if (Schema::hasTable('personal_access_tokens')) {
            Schema::table('personal_access_tokens', function (Blueprint $t) {
                $t->index('last_used_at', 'pat_last_used_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::table('personal_access_tokens', fn (Blueprint $t) => $t->dropIndex('pat_last_used_idx'));
    }
};
