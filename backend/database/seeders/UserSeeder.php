<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {

        $admin = \App\Models\User::create([
            'first_name' => 'Super',
            'last_name' => 'Admin',
            'email' => 'admin@intersmart.in',
            'password' => bcrypt('Admin@123456'),
            'employee_code' => 'EMP-001',
            'designation' => 'Administrator',
            'status' => 'Active',
        ]);
        $admin->assignRole('Super Admin');
        
        // Demo Team Lead
        $lead = \App\Models\User::create([
            'first_name' => 'Team',
            'last_name' => 'Lead',
            'email' => 'lead@intersmart.in',
            'password' => bcrypt('password'),
            'employee_code' => 'EMP-002',
            'designation' => 'Lead Developer',
            'status' => 'Active',
            'team_id' => 1
        ]);
        $lead->assignRole('Team Lead');
        
        // Demo Employee
        $emp = \App\Models\User::create([
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'employee@intersmart.in',
            'password' => bcrypt('password'),
            'employee_code' => 'EMP-003',
            'designation' => 'Software Engineer',
            'status' => 'Active',
            'team_id' => 1
        ]);
        $emp->assignRole('Employee');
    

        //
    }
}
