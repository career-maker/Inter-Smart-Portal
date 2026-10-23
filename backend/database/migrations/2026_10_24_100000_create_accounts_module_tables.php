<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** Accounts module (Phase 1). Add-only: new tables and one new role. Ships dark behind module.accounts.enabled. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_finance', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->unique()->constrained('pm_projects')->cascadeOnDelete();
            $table->decimal('contract_value', 12, 2)->default(0);
            $table->foreignId('sales_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('project_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('pm_projects')->cascadeOnDelete();
            $table->string('kind', 20)->default('installment'); // advance | installment | final
            $table->decimal('amount', 12, 2);
            $table->date('due_date')->nullable();
            $table->string('status', 20)->default('Awaiting'); // Awaiting | Approved | Rejected
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();
            $table->index(['project_id', 'status']);
        });

        Schema::create('project_budget_changes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('pm_projects')->cascadeOnDelete();
            $table->decimal('old_value', 12, 2);
            $table->decimal('new_value', 12, 2);
            $table->text('reason');
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('sales_targets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->char('period', 7); // YYYY-MM
            $table->decimal('target_amount', 12, 2);
            $table->foreignId('set_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'period']);
        });

        Schema::create('amc_contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('pm_projects')->cascadeOnDelete();
            $table->string('client_name')->nullable();
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('amount', 12, 2)->default(0);
            $table->string('status', 20)->default('Active'); // Active | Expired | Renewed | Cancelled
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['status', 'end_date']);
        });

        // New role only; existing roles are untouched.
        if (! DB::table('roles')->where('name', 'Accounts')->where('guard_name', 'web')->exists()) {
            DB::table('roles')->insert(['name' => 'Accounts', 'guard_name' => 'web', 'created_at' => now(), 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('amc_contracts');
        Schema::dropIfExists('sales_targets');
        Schema::dropIfExists('project_budget_changes');
        Schema::dropIfExists('project_payments');
        Schema::dropIfExists('project_finance');
        DB::table('roles')->where('name', 'Accounts')->where('guard_name', 'web')->delete();
    }
};
