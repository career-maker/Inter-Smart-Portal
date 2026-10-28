<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * In this company the project manager and the project coordinator are the same people: everyone in the PMO teams (PMO 1, PMO 2 ...).
 * Gives the "Project manager" privilege to every team whose name starts with PMO, unless the Super Admin has already chosen.
 * Add-only (one settings row); the Super Admin can change or reset it in Portal Customization > Module privileges.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::table('system_settings')->where('key', 'access.pmo_manager')->exists()) {
            return;
        }
        $teams = DB::table('teams')->where('name', 'like', 'pmo%')->whereNull('deleted_at')->pluck('id')->map(fn ($i) => (int) $i)->all();
        if ($teams) {
            DB::table('system_settings')->insert(['key' => 'access.pmo_manager', 'value' => json_encode(['users' => [], 'teams' => $teams]), 'created_at' => now(), 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        DB::table('system_settings')->where('key', 'access.pmo_manager')->delete();
    }
};
