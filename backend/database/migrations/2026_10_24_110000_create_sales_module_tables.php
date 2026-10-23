<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Sales module (Phase 2). Add-only: new tables. Ships dark behind module.sales.enabled. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // company / client
            $table->string('contact_name')->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('source')->nullable();
            $table->string('status', 20)->default('New'); // New | Follow up | Hot | Ready to close | Won | Lost
            $table->decimal('expected_value', 12, 2)->default(0);
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->date('next_followup_at')->nullable();
            $table->text('notes')->nullable();
            $table->text('lost_reason')->nullable();
            $table->foreignId('converted_project_id')->nullable()->constrained('pm_projects')->nullOnDelete();
            $table->timestamps();
            $table->index(['owner_id', 'status']);
        });

        Schema::create('lead_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('kind', 20)->default('followup'); // followup | proposal | meeting | other
            $table->string('title');
            $table->date('due_at')->nullable();
            $table->string('status', 20)->default('Open'); // Open | Done | Cancelled
            $table->text('outcome')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->index(['owner_id', 'status', 'due_at']);
        });

        // What Sales captures when creating a project (the PC later sees this as the fixed project info).
        Schema::create('project_intake', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->unique()->constrained('pm_projects')->cascadeOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained('leads')->nullOnDelete();
            $table->string('client_name');
            $table->string('client_email')->nullable();
            $table->string('client_phone', 50)->nullable();
            $table->string('site_category', 30); // CMS | Ecom | Custom web | Mobile app
            $table->string('cms_variant', 40)->nullable(); // Copy of other website | AI/Custom
            $table->string('platform', 100);
            $table->unsignedInteger('pages_count')->nullable();
            $table->string('quality_level', 20)->nullable(); // Basic | Standard | Premium
            $table->decimal('budget', 12, 2)->default(0);
            $table->foreignId('sales_user_id')->constrained('users')->cascadeOnDelete();
            $table->text('overview')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_intake');
        Schema::dropIfExists('lead_activities');
        Schema::dropIfExists('leads');
    }
};
