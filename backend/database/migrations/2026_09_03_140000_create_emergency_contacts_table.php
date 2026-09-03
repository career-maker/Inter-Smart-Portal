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
        // 1. Create emergency_contacts table
        if (!Schema::hasTable('emergency_contacts')) {
            Schema::create('emergency_contacts', function (Blueprint $table) {
                $table->id();
                $table->string('name', 255);
                $table->string('role', 255); // e.g. "Team HR", "Lead PHP Developer"
                $table->string('email', 255)->nullable();
                $table->string('phone', 50)->nullable();
                $table->string('department', 100)->nullable(); // e.g. "HR", "Development", "Design", "Technical"
                $table->string('avatar_bg', 50)->default('bg-indigo-500');
                $table->string('initials', 10)->nullable();
                $table->integer('order')->default(0);
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->index('is_active');
                $table->index('order');
            });
        }

        // 2. Ensure Emergency Contacts add-on is seeded in pm_addons table
        if (Schema::hasTable('pm_addons')) {
            $exists = DB::table('pm_addons')->where('key', 'emergency_contacts')->exists();
            if (!$exists) {
                DB::table('pm_addons')->insert([
                    'key'         => 'emergency_contacts',
                    'name'        => 'Emergency Contacts',
                    'description' => 'Manage, edit, add, and delete emergency contacts displayed on the employee dashboard.',
                    'icon'        => 'LifeBuoy',
                    'is_active'   => true,
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ]);
            }
        }

        // 3. Seed initial default contacts if table is empty
        if (Schema::hasTable('emergency_contacts')) {
            $contactCount = DB::table('emergency_contacts')->count();
            if ($contactCount === 0) {
                DB::table('emergency_contacts')->insert([
                    [
                        'name'        => 'Sahad, Nobby',
                        'role'        => 'Team HR',
                        'email'       => 'hr@intersmart.in',
                        'phone'       => null,
                        'department'  => 'HR',
                        'avatar_bg'   => 'bg-rose-500',
                        'initials'    => 'HR',
                        'order'       => 1,
                        'is_active'   => true,
                        'created_at'  => now(),
                        'updated_at'  => now(),
                    ],
                    [
                        'name'        => 'Manu K O',
                        'role'        => 'Lead PHP Developer',
                        'email'       => 'manu@intersmart.in',
                        'phone'       => null,
                        'department'  => 'Development',
                        'avatar_bg'   => 'bg-indigo-500',
                        'initials'    => 'MK',
                        'order'       => 2,
                        'is_active'   => true,
                        'created_at'  => now(),
                        'updated_at'  => now(),
                    ],
                    [
                        'name'        => 'Vishal Ramesh',
                        'role'        => 'Lead UI/UX Developer',
                        'email'       => 'vishal@intersmart.in',
                        'phone'       => null,
                        'department'  => 'Design',
                        'avatar_bg'   => 'bg-sky-500',
                        'initials'    => 'VR',
                        'order'       => 3,
                        'is_active'   => true,
                        'created_at'  => now(),
                        'updated_at'  => now(),
                    ],
                    [
                        'name'        => 'Abhiram P Mohan',
                        'role'        => 'Technical Support / Portal Helpdesk',
                        'email'       => 'abhiram@intersmart.in',
                        'phone'       => null,
                        'department'  => 'Technical',
                        'avatar_bg'   => 'bg-purple-600',
                        'initials'    => 'AP',
                        'order'       => 4,
                        'is_active'   => true,
                        'created_at'  => now(),
                        'updated_at'  => now(),
                    ],
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('emergency_contacts');
        if (Schema::hasTable('pm_addons')) {
            DB::table('pm_addons')->where('key', 'emergency_contacts')->delete();
        }
    }
};
