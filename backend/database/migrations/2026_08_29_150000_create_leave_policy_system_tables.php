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
        // 1. Global Leave Policy Settings
        if (!Schema::hasTable('leave_policy_settings')) {
            Schema::create('leave_policy_settings', function (Blueprint $table) {
                $table->id();
                $table->unsignedTinyInteger('monthly_cycle_start_day')->default(26); // e.g. 26th of every month
                $table->unsignedSmallInteger('probation_period_months')->default(6); // default 6 months
                $table->decimal('default_monthly_cl', 4, 2)->default(1.00); // 1 CL per month
                $table->decimal('default_monthly_sl', 4, 2)->default(1.00); // 1 SL per month
                $table->unsignedSmallInteger('cl_carry_forward_years')->default(2); // 2 years
                $table->boolean('sl_carry_forward_allowed')->default(false); // false = expires at year end
                $table->timestamps();
            });

            // Seed default row if empty
            DB::table('leave_policy_settings')->insert([
                'monthly_cycle_start_day'   => 26,
                'probation_period_months'   => 6,
                'default_monthly_cl'        => 1.00,
                'default_monthly_sl'        => 1.00,
                'cl_carry_forward_years'    => 2,
                'sl_carry_forward_allowed'  => false,
                'created_at'                => now(),
                'updated_at'                => now(),
            ]);
        }

        // 2. Employee-specific Leave Policy Overrides
        if (!Schema::hasTable('employee_leave_policies')) {
            Schema::create('employee_leave_policies', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->unique()->constrained('users')->onDelete('cascade');
                $table->decimal('custom_monthly_cl', 4, 2)->nullable();
                $table->decimal('custom_monthly_sl', 4, 2)->nullable();
                $table->unsignedSmallInteger('custom_probation_months')->nullable();
                $table->boolean('probation_cleared_manually')->default(false);
                $table->timestamp('probation_cleared_at')->nullable();
                $table->foreignId('probation_cleared_by')->nullable()->constrained('users')->nullOnDelete();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        // 3. Leave Allocation & Balance Ledger (Auditability & Idempotency)
        if (!Schema::hasTable('leave_allocation_ledgers')) {
            Schema::create('leave_allocation_ledgers', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->string('leave_type', 50); // 'Casual Leave', 'Sick Leave', 'CL Carry Forward'
                $table->decimal('amount', 5, 2); // e.g. +1.00, -2.00
                $table->string('transaction_type', 50); // 'automatic_allocation', 'manual_adjustment', 'probation_clearance', 'carry_forward', 'expiration', 'leave_taken', 'leave_reversal'
                $table->string('cycle_key', 50)->nullable()->index(); // e.g. '2026-08-26'
                $table->decimal('opening_balance', 6, 2);
                $table->decimal('closing_balance', 6, 2);
                $table->foreignId('modified_by')->nullable()->constrained('users')->nullOnDelete();
                $table->text('remarks')->nullable();
                $table->integer('carry_forward_year')->nullable();
                $table->date('expires_at')->nullable();
                $table->timestamps();

                $table->index(['user_id', 'cycle_key', 'transaction_type', 'leave_type'], 'idx_user_cycle_trans_type');
            });
        }

        // 4. Update leave_balances with tracking columns if not already present
        if (Schema::hasTable('leave_balances')) {
            Schema::table('leave_balances', function (Blueprint $table) {
                if (!Schema::hasColumn('leave_balances', 'probation_cleared_manually')) {
                    $table->boolean('probation_cleared_manually')->default(false)->after('probation_leaves_allocated');
                }
                if (!Schema::hasColumn('leave_balances', 'last_allocated_cycle')) {
                    $table->string('last_allocated_cycle', 50)->nullable()->after('probation_cleared_manually');
                }
            });
        }

        // 5. Seed leave_policy add-on in pm_addons table if pm_addons exists
        if (Schema::hasTable('pm_addons')) {
            $exists = DB::table('pm_addons')->where('key', 'leave_policy')->exists();
            if (!$exists) {
                DB::table('pm_addons')->insert([
                    'key'         => 'leave_policy',
                    'name'        => 'Leave Policy Management',
                    'description' => 'Configurable monthly cycle start day, dynamic probation rules, auto CL/SL allocations, 2-year carry forward, annual SL expiry, and employee overrides.',
                    'icon'        => 'CalendarCheck',
                    'is_active'   => true,
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leave_allocation_ledgers');
        Schema::dropIfExists('employee_leave_policies');
        Schema::dropIfExists('leave_policy_settings');

        if (Schema::hasTable('leave_balances')) {
            Schema::table('leave_balances', function (Blueprint $table) {
                if (Schema::hasColumn('leave_balances', 'probation_cleared_manually')) {
                    $table->dropColumn('probation_cleared_manually');
                }
                if (Schema::hasColumn('leave_balances', 'last_allocated_cycle')) {
                    $table->dropColumn('last_allocated_cycle');
                }
            });
        }
    }
};
