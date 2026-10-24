<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Phase 5: the coordinator asks the system admin team for a server; they allocate it and mark the project live. Add-only; dark behind module.pmo.enabled. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_go_live', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->unique()->constrained('pm_projects')->cascadeOnDelete();
            $table->string('status', 20)->default('Requested'); // Requested | Allocated | Live
            $table->text('request_note')->nullable();
            $table->string('server_details', 1000)->nullable(); // host / domain notes, never passwords
            $table->string('live_url', 1000)->nullable();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('allocated_at')->nullable();
            $table->timestamp('live_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_go_live');
    }
};
