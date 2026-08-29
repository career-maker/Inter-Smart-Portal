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
        if (!Schema::hasTable('custom_team_permissions')) {
            Schema::create('custom_team_permissions', function (Blueprint $table) {
                $table->id();
                $table->string('permission_key', 100)->index();
                $table->foreignId('team_id')->constrained('teams')->onDelete('cascade');
                $table->enum('scope', ['all_members', 'leads_only'])->default('all_members');
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->unique(['permission_key', 'team_id'], 'uniq_perm_team');
            });
        }

        // Seed 'permissions' addon into pm_addons
        if (Schema::hasTable('pm_addons')) {
            $exists = DB::table('pm_addons')->where('key', 'permissions')->exists();
            if (!$exists) {
                DB::table('pm_addons')->insert([
                    'key' => 'permissions',
                    'name' => 'Team & Role Permissions',
                    'description' => 'Fine-grained cross-team visibility, task switcher, task creation/assignment, and team-lead-only scoping.',
                    'icon' => 'Shield',
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('custom_team_permissions');
    }
};
