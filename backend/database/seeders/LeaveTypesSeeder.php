<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class LeaveTypesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $types = [
            'Sick Leave',
            'Casual Leave',
            'Half Day Sick Leave (Morning)',
            'Half Day Sick Leave (Afternoon)',
            'Half Day Casual Leave (Morning)',
            'Half Day Casual Leave (Afternoon)',
            'Work From Home',
            'Work From Home (Morning)',
            'Work From Home (Afternoon)',
            'Half Day WFH (Morning)',
            'Half Day WFH (Afternoon)'
        ];

        foreach ($types as $type) {
            \App\Models\LeaveType::firstOrCreate(
                ['name' => $type]
            );
        }
    }
}
