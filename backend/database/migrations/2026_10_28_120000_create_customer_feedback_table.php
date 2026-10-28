<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Customer feedback notes: the project manager records it during a project, HR after go-live. The questions are asked by phone, outside the portal. Add-only; dark behind module.customer_feedback.enabled. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_feedback', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('pm_projects')->cascadeOnDelete();
            $table->string('stage', 20);                         // during | post_live
            $table->foreignId('recorded_by')->constrained('users')->cascadeOnDelete();
            $table->string('contact_name');                      // who at the client was called
            $table->date('call_date');
            $table->unsignedTinyInteger('score')->nullable();    // optional overall score 1-5; does not feed anyone's rating
            $table->text('notes');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_feedback');
    }
};
