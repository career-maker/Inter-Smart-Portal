<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Meetings (client and internal): date, attendees, minutes, follow-up actions, calendar invite. Add-only; dark behind module.meetings.enabled. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meetings', function (Blueprint $table) {
            $table->id();
            $table->string('kind', 20)->default('internal'); // client | internal
            $table->string('title');
            $table->foreignId('organizer_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedBigInteger('project_id')->nullable();
            $table->unsignedBigInteger('lead_id')->nullable();  // Sales lead for a client meeting
            $table->dateTime('starts_at');                      // stored in UTC
            $table->dateTime('ends_at');
            $table->string('location')->nullable();             // room or meeting link
            $table->text('agenda')->nullable();
            $table->text('minutes')->nullable();
            $table->json('external_emails')->nullable();        // client attendees who have no portal account
            $table->string('status', 20)->default('Scheduled'); // Scheduled, Done, Cancelled
            $table->timestamps();
        });

        Schema::create('meeting_user', function (Blueprint $table) {
            $table->foreignId('meeting_id')->constrained('meetings')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->primary(['meeting_id', 'user_id']);
        });

        Schema::create('meeting_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meeting_id')->constrained('meetings')->cascadeOnDelete();
            $table->string('text');
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('due_date')->nullable();
            $table->boolean('done')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meeting_actions');
        Schema::dropIfExists('meeting_user');
        Schema::dropIfExists('meetings');
    }
};
