<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class TeamSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {

        \App\Models\Team::create(['name' => 'Engineering', 'code' => 'ENG']);
        \App\Models\Team::create(['name' => 'Human Resources', 'code' => 'HR']);
        \App\Models\Team::create(['name' => 'Sales', 'code' => 'SALES']);
    

        //
    }
}
