<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** Makes the person with the email hr@intersmart.in the HR privilege holder, unless the Super Admin has already chosen. Add-only (one settings row). */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::table('system_settings')->where('key', 'access.hr')->exists()) {
            return;
        }
        $id = DB::table('users')->whereRaw('lower(email) = ?', ['hr@intersmart.in'])->value('id');
        if ($id) {
            DB::table('system_settings')->insert(['key' => 'access.hr', 'value' => json_encode(['users' => [(int) $id], 'teams' => []]), 'created_at' => now(), 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        DB::table('system_settings')->where('key', 'access.hr')->delete();
    }
};
