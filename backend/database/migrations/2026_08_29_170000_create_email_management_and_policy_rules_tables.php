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
        // 1. Add rules & cutoff columns to leave_policy_settings
        if (Schema::hasTable('leave_policy_settings')) {
            Schema::table('leave_policy_settings', function (Blueprint $table) {
                if (!Schema::hasColumn('leave_policy_settings', 'cl_advance_notice_days')) {
                    $table->unsignedSmallInteger('cl_advance_notice_days')->default(3)->after('sl_carry_forward_allowed');
                }
                if (!Schema::hasColumn('leave_policy_settings', 'wfh_morning_cutoff_time')) {
                    $table->string('wfh_morning_cutoff_time', 10)->default('09:45')->after('cl_advance_notice_days');
                }
                if (!Schema::hasColumn('leave_policy_settings', 'wfh_afternoon_cutoff_time')) {
                    $table->string('wfh_afternoon_cutoff_time', 10)->default('14:30')->after('wfh_morning_cutoff_time');
                }
                if (!Schema::hasColumn('leave_policy_settings', 'single_day_approval_level')) {
                    $table->string('single_day_approval_level', 20)->default('tl_only')->after('wfh_afternoon_cutoff_time');
                }
                if (!Schema::hasColumn('leave_policy_settings', 'multi_day_approval_threshold')) {
                    $table->unsignedSmallInteger('multi_day_approval_threshold')->default(2)->after('single_day_approval_level');
                }
                if (!Schema::hasColumn('leave_policy_settings', 'lop_admin_approval_required')) {
                    $table->boolean('lop_admin_approval_required')->default(true)->after('multi_day_approval_threshold');
                }
            });
        }

        // 2. Create email_settings table if it doesn't exist
        if (!Schema::hasTable('email_settings')) {
            Schema::create('email_settings', function (Blueprint $table) {
                $table->id();
                $table->string('key', 100)->unique();
                $table->longText('value')->nullable();
                $table->timestamps();
            });
        }

        // 3. Ensure Email Management is seeded in pm_addons
        if (Schema::hasTable('pm_addons')) {
            $exists = DB::table('pm_addons')->where('key', 'email_management')->exists();
            if (!$exists) {
                DB::table('pm_addons')->insert([
                    'key' => 'email_management',
                    'name' => 'Email & SMTP Management',
                    'description' => 'Configure SMTP credentials, Gmail App Passwords, global notification recipient matrix, and employee-specific email routing overrides.',
                    'icon' => 'Mail',
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // 4. Seed default SMTP config if empty
        $defaultSmtp = [
            'host' => 'smtp.gmail.com',
            'port' => 587,
            'encryption' => 'tls',
            'username' => 'career@intersmart.in',
            'password' => '',
            'from_address' => 'career@intersmart.in',
            'from_name' => 'Inter Smart Portal',
        ];
        DB::table('email_settings')->updateOrInsert(
            ['key' => 'smtp_config'],
            ['value' => json_encode($defaultSmtp), 'updated_at' => now(), 'created_at' => now()]
        );

        // 5. Seed default Global Routing Rules if empty
        $defaultRouting = [
            'leave_application' => [
                'name' => 'General Leave Application',
                'notify_tl' => true,
                'notify_admin' => true,
                'notify_hr' => true,
                'cc_applicant' => true,
                'custom_to' => [],
                'custom_cc' => ['hr@intersmart.in', 'admin@intersmart.in'],
                'enabled' => true,
            ],
            'leave_cl_short_notice' => [
                'name' => 'Casual Leave (Short Notice < X Days)',
                'notify_tl' => true,
                'notify_admin' => true,
                'notify_hr' => true,
                'cc_applicant' => true,
                'custom_to' => [],
                'custom_cc' => ['hr@intersmart.in', 'admin@intersmart.in'],
                'enabled' => true,
            ],
            'wfh_application' => [
                'name' => 'Work From Home (WFH) Request',
                'notify_tl' => true,
                'notify_admin' => true,
                'notify_hr' => true,
                'cc_applicant' => true,
                'custom_to' => [],
                'custom_cc' => ['hr@intersmart.in', 'admin@intersmart.in'],
                'enabled' => true,
            ],
            'recognition_award' => [
                'name' => 'Employee Awards & Recognitions',
                'notify_recipient' => true,
                'custom_to' => [],
                'custom_cc' => ['hr@intersmart.in', 'admin@intersmart.in'],
                'enabled' => true,
            ],
            'ta_claim' => [
                'name' => 'Travel Allowance (TA) Claims',
                'notify_admin' => true,
                'custom_to' => ['HR@intersmart.in', 'Ameesha@intersmart.in'],
                'custom_cc' => ['admin@intersmart.in'],
                'enabled' => true,
            ],
            'document_request' => [
                'name' => 'HR Document & Policy Requests',
                'notify_admin' => true,
                'custom_to' => ['HR@intersmart.in'],
                'custom_cc' => ['admin@intersmart.in'],
                'enabled' => true,
            ],
        ];
        DB::table('email_settings')->updateOrInsert(
            ['key' => 'global_routing'],
            ['value' => json_encode($defaultRouting), 'updated_at' => now(), 'created_at' => now()]
        );

        // 6. Seed default Employee Overrides list if empty
        if (!DB::table('email_settings')->where('key', 'employee_overrides')->exists()) {
            DB::table('email_settings')->insert([
                'key' => 'employee_overrides',
                'value' => json_encode([]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Safe reversible migration
    }
};
