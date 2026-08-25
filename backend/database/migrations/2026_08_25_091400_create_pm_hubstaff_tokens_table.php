<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Project Management module — pm_hubstaff_tokens.
     *
     * Singleton OAuth2 token store (id is constrained to 1), isolated to
     * PM. No raw Hubstaff activity history is stored anywhere — this
     * table holds only the refresh/access token pair, never time-tracking
     * data. Mirrors the legacy QA Tracker's own `hubstaff_tokens` shape,
     * which was already good practice, just PM-owned instead of shared.
     *
     * id is a plain PRIMARY KEY, deliberately WITHOUT auto-increment.
     * MySQL 8.0.16+ forbids a CHECK constraint from referencing an
     * AUTO_INCREMENT column at all (error 3818: "Check constraint ...
     * cannot refer to an auto-increment column") — CHECK (id = 1) on an
     * auto-increment id is rejected outright, not merely unenforced.
     * Dropping auto-increment (application code always inserts/upserts
     * this single row with id = 1 explicitly — a normal, expected pattern
     * for a singleton-row table) makes CHECK (id = 1) valid again and
     * keeps the singleton rule enforced at the database layer, not just
     * by application discipline. No new column was introduced and no
     * Hubstaff functionality was weakened — same table, same 5 columns,
     * same guarantee (at most one global token/config row can ever
     * exist), just without a column type MySQL specifically disallows a
     * CHECK from referencing.
     */
    public function up(): void
    {
        Schema::create('pm_hubstaff_tokens', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->primary();
            $table->text('access_token');
            $table->text('refresh_token');
            $table->bigInteger('expires_at');
            $table->timestamp('updated_at')->nullable();
        });

        DB::statement('ALTER TABLE pm_hubstaff_tokens ADD CONSTRAINT pm_hubstaff_tokens_single_row CHECK (id = 1)');
    }

    public function down(): void
    {
        Schema::dropIfExists('pm_hubstaff_tokens');
    }
};
