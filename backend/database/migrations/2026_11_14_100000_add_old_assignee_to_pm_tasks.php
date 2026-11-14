<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pm_tasks', function (Blueprint $table) {
            // Name from the old team tracker when that person has no account in this portal.
            $table->string('old_assignee_name', 150)->nullable()->after('team_id');
            // Id of the task in the old tracker; makes a re-import update instead of duplicate.
            $table->string('legacy_id', 64)->nullable()->unique()->after('old_assignee_name');
        });
    }

    public function down(): void
    {
        Schema::table('pm_tasks', function (Blueprint $table) {
            $table->dropUnique(['legacy_id']);
            $table->dropColumn(['old_assignee_name', 'legacy_id']);
        });
    }
};
