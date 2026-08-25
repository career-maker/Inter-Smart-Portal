<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * Project Management module — permission seeder.
 *
 * Deliberately SEPARATE from RolesAndPermissionsSeeder.php, which is
 * never edited (per PROJECT_MANAGEMENT_MODULE_DESIGN.md §1/§6). Creates
 * ONLY the 8 finalized PM permissions and attaches them to the existing
 * three HR roles (Employee, Team Lead, Super Admin) — no new role is
 * created here or anywhere else. Naming follows the exact existing
 * convention confirmed in RolesAndPermissionsSeeder.php: lowercase,
 * space-separated strings (e.g. 'approve leaves'), never dot notation.
 *
 * Run manually (never auto-run by DatabaseSeeder, to keep this stage's
 * footprint additive/explicit — matches the design doc's own "isolated
 * seeder" pattern):
 *   php artisan db:seed --class=ProjectManagementPermissionsSeeder
 *
 * Idempotent — safe to run more than once (firstOrCreate throughout).
 */
class ProjectManagementPermissionsSeeder extends Seeder
{
    /** The finalized PM permission list — see design doc §6. No 'coordinate projects' permission exists; Project Coordinator is a data relationship, not a grantable capability. */
    public const PERMISSIONS = [
        'manage projects',
        'view all projects',
        'manage tasks',
        'manage checklists',
        'manage corrections',
        'view pm reports',
        'manage sub phases',
        'manage hubstaff',
        'manage project settings',
    ];

    /** Team Lead's default grant — own-team scope enforced in application code, not by the permission itself. */
    public const TEAM_LEAD_PERMISSIONS = [
        'manage projects',
        'manage tasks',
        'manage checklists',
        'manage corrections',
        'view pm reports',
    ];

    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        foreach (self::PERMISSIONS as $name) {
            Permission::firstOrCreate(['name' => $name]);
        }

        $superAdmin = Role::where('name', 'Super Admin')->first();
        if ($superAdmin) {
            $superAdmin->givePermissionTo(self::PERMISSIONS);
        }

        $teamLead = Role::where('name', 'Team Lead')->first();
        if ($teamLead) {
            $teamLead->givePermissionTo(self::TEAM_LEAD_PERMISSIONS);
        }

        // Employee: no PM permissions granted — full baseline participation
        // (own assigned tasks, comments, own-visible checklists/corrections)
        // is authorized entirely via inline object-level checks in
        // ProjectAuthorizationService, exactly mirroring how a plain
        // Employee already interacts with Leave/WFH/Issues without any
        // Spatie permission at all.
    }
}
