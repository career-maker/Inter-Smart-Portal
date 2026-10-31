<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** A QA request, once assigned, becomes a task on the Tasks page with the QA lead's start and end dates. Add-only. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('qa_requests', function (Blueprint $table) {
            $table->unsignedBigInteger('task_id')->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('qa_requests', function (Blueprint $table) {
            $table->dropColumn(['task_id', 'start_date', 'end_date']);
        });
    }
};
