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
     */
    public function up(): void
    {
        Schema::create('pm_hubstaff_tokens', function (Blueprint $table) {
            $table->id();
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
