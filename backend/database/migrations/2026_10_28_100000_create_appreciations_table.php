<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Appreciation nominations: team leads, HR and PCs nominate; the project manager or HR approves. Add-only; dark behind module.appreciation.enabled. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appreciations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('nominee_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('nominated_by')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('reason');
            $table->string('status', 20)->default('Pending'); // Pending, Approved, Rejected
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('decision_note')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->unsignedBigInteger('recognition_id')->nullable();   // the Hall entry created on approval
            $table->unsignedBigInteger('announcement_id')->nullable();  // the company announcement created on approval
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appreciations');
    }
};
