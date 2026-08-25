<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds catalog_task_id to pm_tasks.
     * Nullable to ensure custom tasks (catalog_task_id = NULL) remain first-class.
     * Preserves all existing tasks without modification.
     */
    public function up(): void
    {
        Schema::table('pm_tasks', function (Blueprint $table) {
            $table->unsignedBigInteger('catalog_task_id')->nullable()->after('sub_phase_id');

            $table->foreign('catalog_task_id')
                ->references('id')
                ->on('pm_task_catalogs')
                ->onDelete('set null');

            $table->index('catalog_task_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pm_tasks', function (Blueprint $table) {
            $table->dropForeign(['catalog_task_id']);
            $table->dropColumn('catalog_task_id');
        });
    }
};
