<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\User;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        try {
            User::where('first_name', 'like', 'nandana%')
                ->orWhere('last_name', 'like', 'nandana%')
                ->update(['team_id' => null]);
        } catch (\Throwable $e) {
            \Log::warning('Could not unassign Nandana in migration: ' . $e->getMessage());
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
