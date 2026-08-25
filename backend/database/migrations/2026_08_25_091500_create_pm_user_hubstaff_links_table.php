<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Project Management module — pm_user_hubstaff_links.
     *
     * Explicit employee <-> Hubstaff-user-ID link, referencing the
     * existing HR `users` table directly. Deliberately a new table
     * rather than a new column on `users` itself — keeps the existing
     * HR `users` table completely untouched while still satisfying the
     * "explicit ID field on the employee record" need. Replaces the
     * legacy QA Tracker's hardcoded, staff-roster-specific name-matching
     * dictionaries entirely.
     */
    public function up(): void
    {
        Schema::create('pm_user_hubstaff_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->onDelete('cascade');
            $table->string('hubstaff_user_id');
            $table->foreignId('linked_by')->constrained('users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pm_user_hubstaff_links');
    }
};
