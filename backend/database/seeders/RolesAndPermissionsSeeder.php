<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // create permissions
        Permission::create(['name' => 'manage employees']);
        Permission::create(['name' => 'manage teams']);
        Permission::create(['name' => 'manage leaves']);
        Permission::create(['name' => 'approve leaves']);
        
        // create roles and assign permissions
        $role1 = Role::create(['name' => 'Employee']);
        
        $role2 = Role::create(['name' => 'Team Lead']);
        $role2->givePermissionTo(Permission::where('name', 'approve leaves')->first());
        
        $role3 = Role::create(['name' => 'Super Admin']);
        $role3->givePermissionTo(Permission::all());
    

        //
    }
}
