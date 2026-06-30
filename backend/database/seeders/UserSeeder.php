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
    }
}
