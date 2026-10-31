<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** A timeline sub-task can also create real tasks on the Tasks page; their ids are kept so removing the sub-task removes them. Add-only. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('work_tracker_subtasks', function (Blueprint $table) {
            $table->json('task_ids')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('work_tracker_subtasks', function (Blueprint $table) {
            $table->dropColumn('task_ids');
        });
    }
};
