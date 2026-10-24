<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Phase 5: a team lead's monthly feedback on a team member, from four fixed questions scored 1 to 5. Add-only; dark behind module.workflow.enabled. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_feedback', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();   // the member being rated
            $table->foreignId('given_by')->constrained('users')->cascadeOnDelete(); // the team lead
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->char('month', 7); // YYYY-MM; one entry per member per lead per month
            $table->unsignedTinyInteger('attitude');
            $table->unsignedTinyInteger('attire');
            $table->unsignedTinyInteger('learning');
            $table->unsignedTinyInteger('on_time');
            $table->text('comment')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'given_by', 'month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_feedback');
    }
};
