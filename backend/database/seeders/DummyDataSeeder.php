<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\Team;
use App\Models\User;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\WfhRequest;
use App\Models\Announcement;
use App\Models\Holiday;
use App\Models\LeaveType;
use Carbon\Carbon;
use Faker\Factory as Faker;

class DummyDataSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create();
        $today = Carbon::today();

        // 1. Create More Teams
        $teamNames = ['Marketing', 'Design', 'Product Management', 'Customer Support', 'Quality Assurance'];
        $teams = [];
        foreach ($teamNames as $name) {
            $code = strtoupper(substr($name, 0, 3)) . '-' . rand(10, 99);
            $teams[] = Team::firstOrCreate(['name' => $name], ['description' => $faker->sentence, 'code' => $code]);
        }

        // Include existing teams
        $allTeams = Team::all();

        // 2. Leave Types
        $sickLeave = LeaveType::where('name', 'Sick Leave')->first() ?? LeaveType::create(['name' => 'Sick Leave', 'is_paid' => true]);
        $casualLeave = LeaveType::where('name', 'Casual Leave')->first() ?? LeaveType::create(['name' => 'Casual Leave', 'is_paid' => true]);
        
        $admin = User::role('Super Admin')->first();

        // 3. Create Employees
        $users = [];
        for ($i = 0; $i < 25; $i++) {
            $gender = $faker->randomElement(['Male', 'Female']);
            $team = $allTeams->random();
            $joinDate = $faker->dateTimeBetween('-5 years', '-1 month');
            $dob = $faker->dateTimeBetween('-40 years', '-22 years');
            
            $user = User::create([
                'first_name' => $faker->firstName($gender == 'Male' ? 'male' : 'female'),
                'last_name' => $faker->lastName,
                'email' => $faker->unique()->safeEmail,
                'personal_email' => $faker->unique()->freeEmail,
                'password' => Hash::make('password'),
                'employee_code' => 'EMP-' . str_pad((User::count() + 100 + $i), 3, '0', STR_PAD_LEFT),
                'designation' => $faker->jobTitle,
                'team_id' => $team->id,
                'status' => 'Active',
                'joining_date' => $joinDate,
                'dob' => $dob,
                'gender' => $gender,
                'blood_group' => $faker->randomElement(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']),
                'marital_status' => $faker->randomElement(['Single', 'Married']),
                'contact_number' => $faker->phoneNumber,
                'permanent_address' => $faker->address,
                'current_address' => $faker->address,
            ]);
            
            $user->assignRole('Employee');
            $users[] = $user;
        }

        // 4. Create Leave Balances
        $allUsers = User::all();
        foreach ($allUsers as $user) {
            LeaveBalance::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'casual_leave_balance' => $faker->numberBetween(5, 12),
                    'sick_leave_balance' => $faker->numberBetween(5, 12),
                    'total_leaves_taken' => $faker->numberBetween(0, 5),
                ]
            );
        }

        // 5. Create Leave Requests and WFH Requests
        $statuses = ['Pending', 'Approved', 'Rejected'];
        foreach ($users as $user) {
            // Leave Requests
            $numLeaves = $faker->numberBetween(1, 4);
            for ($l = 0; $l < $numLeaves; $l++) {
                $status = $faker->randomElement($statuses);
                $leaveDate = clone $today;
                $leaveDate->addDays($faker->numberBetween(-30, 30)); // some past, some future
                
                LeaveRequest::create([
                    'user_id' => $user->id,
                    'leave_type_id' => $faker->randomElement([$sickLeave->id, $casualLeave->id]),
                    'leave_date' => $leaveDate->format('Y-m-d'),
                    'duration_type' => $faker->randomElement(['Full', 'Half-Morning', 'Half-Afternoon']),
                    'reason' => $faker->sentence,
                    'status' => $status,
                    'approved_by' => $status !== 'Pending' ? $admin->id : null,
                ]);
            }

            // WFH Requests
            $numWfh = $faker->numberBetween(0, 3);
            for ($w = 0; $w < $numWfh; $w++) {
                $status = $faker->randomElement($statuses);
                $wfhDate = clone $today;
                $wfhDate->addDays($faker->numberBetween(-15, 15)); 
                
                WfhRequest::create([
                    'user_id' => $user->id,
                    'wfh_date' => $wfhDate->format('Y-m-d'),
                    'duration_type' => $faker->randomElement(['Full', 'Half-Morning', 'Half-Afternoon']),
                    'reason' => 'Working from home due to ' . $faker->word,
                    'status' => $status,
                    'approved_by' => $status !== 'Pending' ? $admin->id : null,
                ]);
            }
        }

        // 6. Announcements
        for ($a = 0; $a < 8; $a++) {
            Announcement::create([
                'title' => $faker->catchPhrase,
                'content' => $faker->paragraphs(3, true),
                'category' => $faker->randomElement(['General', 'Policy Update', 'Event', 'IT Notice']),
                'is_pinned' => $faker->boolean(20),
                'created_by' => $admin->id,
                'created_at' => $faker->dateTimeBetween('-1 month', 'now'),
            ]);
        }

        // 7. Holidays
        $holidayNames = ['New Year', 'Republic Day', 'Holi', 'Good Friday', 'Eid', 'Independence Day', 'Diwali', 'Christmas'];
        $currentMonth = $today->month;
        foreach ($holidayNames as $index => $name) {
            $hDate = clone $today;
            $hDate->month = ($index % 12) + 1;
            $hDate->day = $faker->numberBetween(1, 28);
            if ($hDate->year < (clone $today)->year) $hDate->addYear(); // Push to future if past
            
            Holiday::firstOrCreate(
                ['date' => $hDate->format('Y-m-d')],
                ['name' => $name]
            );
        }
        
        // Ensure there is at least one WFH and one Leave today for "The Hall"
        if (count($users) >= 2) {
            LeaveRequest::create([
                'user_id' => $users[0]->id,
                'leave_type_id' => $casualLeave->id,
                'leave_date' => $today->format('Y-m-d'),
                'duration_type' => 'Full',
                'reason' => 'Personal emergency',
                'status' => 'Approved',
                'approved_by' => $admin->id,
            ]);
            WfhRequest::create([
                'user_id' => $users[1]->id,
                'wfh_date' => $today->format('Y-m-d'),
                'duration_type' => 'Full',
                'reason' => 'WFH schedule',
                'status' => 'Approved',
                'approved_by' => $admin->id,
            ]);
        }
    }
}
