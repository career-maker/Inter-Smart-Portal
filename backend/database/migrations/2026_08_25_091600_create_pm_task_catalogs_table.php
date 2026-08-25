<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Predefined Task Catalog table.
     * Managed exclusively by Super Admin / HR.
     * Team Leads and Employees consume active catalog entries during task creation.
     */
    public function up(): void
    {
        Schema::create('pm_task_catalogs', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255);
            $table->string('category', 255)->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');

            $table->index('is_active');
            $table->index('category');
            $table->index('name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pm_task_catalogs');
    }
};
