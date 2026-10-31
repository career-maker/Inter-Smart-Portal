<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Extra questions on the Sales "new project" form, defined by the Project manager / Super Admin. Answers are stored in project_intake.details['custom'] by label. Add-only. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_custom_fields', function (Blueprint $table) {
            $table->id();
            $table->string('label', 120);
            $table->string('type', 10)->default('text'); // text | number | date | select
            $table->json('options')->nullable();          // select choices
            $table->boolean('required')->default(false);
            $table->boolean('active')->default(true);
            $table->unsignedInteger('position')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_custom_fields');
    }
};
