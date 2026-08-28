<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('pm_addons')) {
            Schema::create('pm_addons', function (Blueprint $table) {
                $table->id();
                $table->string('key', 50)->unique();
                $table->string('name', 100);
                $table->text('description')->nullable();
                $table->string('icon', 50)->nullable()->default('Bug');
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('pm_team_addons')) {
            Schema::create('pm_team_addons', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('addon_id');
                $table->unsignedBigInteger('team_id');
                $table->timestamps();

                $table->foreign('addon_id')->references('id')->on('pm_addons')->onDelete('cascade');
                $table->foreign('team_id')->references('id')->on('teams')->onDelete('cascade');
                $table->unique(['addon_id', 'team_id']);
            });
        }

        // Seed initial Bug Tracker addon if not exists
        if (Schema::hasTable('pm_addons')) {
            $exists = DB::table('pm_addons')->where('key', 'bug_tracker')->exists();
            if (!$exists) {
                DB::table('pm_addons')->insert([
                    'key' => 'bug_tracker',
                    'name' => 'Bug Tracker & QA Metrics',
                    'description' => 'Enables QA Bug tracking (HTML Bugs, Functional Bugs, Total Bugs, Bug Tracker Link) on task management and provides dedicated QA Bug Reports.',
                    'icon' => 'Bug',
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pm_team_addons');
        Schema::dropIfExists('pm_addons');
    }
};
