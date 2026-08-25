<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Project Management module — pm_checklist_items.
     *
     * Finalized 2-table checklist model (Decision 5): this table holds
     * the reusable, named checklist definitions (equivalent to the
     * legacy QA Tracker's flat `checklists` table) — flat items, no
     * sections/sub-items. `category` is an optional display-grouping
     * label only, not a relational table.
     */
    public function up(): void
    {
        Schema::create('pm_checklist_items', function (Blueprint $table) {
            $table->id();
            $table->string('label');
            $table->text('description')->nullable();
            $table->string('applies_to')->default('project'); // project | task
            $table->string('category')->nullable(); // display grouping only, not a table
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->unique('label');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pm_checklist_items');
    }
};
