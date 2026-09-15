<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Run the migrations to update employee DOB, Joining Date, and Probation End Date.
     */
    public function up(): void
    {
        $employees = [
            [
                'name' => 'Manu K O',
                'dob' => '1990-06-05',
                'joining_date' => '2019-06-15',
                'probation_end_date' => '2019-12-15',
            ],
            [
                'name' => 'Vishal Ramesh',
                'dob' => '1994-06-28',
                'joining_date' => '2019-06-15',
                'probation_end_date' => '2019-12-15',
            ],
            [
                'name' => 'Bindhu Shenoy',
                'dob' => '1985-12-17',
                'joining_date' => '2019-10-18',
                'probation_end_date' => '2020-04-18',
            ],
            [
                'name' => 'Josin Joseph',
                'dob' => '1998-04-20',
                'joining_date' => '2019-10-18',
                'probation_end_date' => '2020-04-18',
            ],
            [
                'name' => 'Soumya S Kumar',
                'dob' => '1997-10-22',
                'joining_date' => '2020-01-22',
                'probation_end_date' => '2020-07-22',
            ],
            [
                'name' => 'Vishnu Sasidharan',
                'dob' => '1990-05-15',
                'joining_date' => '2020-02-10',
                'probation_end_date' => '2020-08-10',
            ],
            [
                'name' => 'Gokul Shaji',
                'dob' => '1996-12-18',
                'joining_date' => '2020-02-24',
                'probation_end_date' => '2020-08-24',
            ],
            [
                'name' => 'Jissa Joseph',
                'dob' => '1985-12-25',
                'joining_date' => '2020-06-26',
                'probation_end_date' => '2020-12-26',
            ],
            [
                'name' => 'Romine George',
                'dob' => '1993-09-27',
                'joining_date' => '2020-09-01',
                'probation_end_date' => '2021-03-01',
            ],
            [
                'name' => 'Akhila Mohanan',
                'dob' => '1995-08-18',
                'joining_date' => '2020-07-20',
                'probation_end_date' => '2021-01-20',
            ],
            [
                'name' => 'Ashmi Mathew',
                'dob' => '1994-12-16',
                'joining_date' => '2020-10-01',
                'probation_end_date' => '2021-04-01',
            ],
            [
                'name' => 'Sunil Anurudhan',
                'dob' => '1987-08-24',
                'joining_date' => '2021-03-22',
                'probation_end_date' => '2021-09-22',
            ],
            [
                'name' => 'Sahad Rahman',
                'dob' => '1991-01-19',
                'joining_date' => '2021-01-01',
                'probation_end_date' => '2021-07-01',
            ],
            [
                'name' => 'Nobby Pachat',
                'dob' => '1990-05-12',
                'joining_date' => '2021-09-01',
                'probation_end_date' => '2022-03-01',
            ],
            [
                'name' => 'Mercy Nelson',
                'dob' => '1964-08-29',
                'joining_date' => '2021-09-15',
                'probation_end_date' => '2022-03-15',
            ],
            [
                'name' => 'Abeesh Unnikrishnan K',
                'dob' => '1997-12-24',
                'joining_date' => '2021-10-28',
                'probation_end_date' => '2022-04-28',
            ],
            [
                'name' => 'Ann Mary Elias',
                'dob' => '1995-03-13',
                'joining_date' => '2022-04-25',
                'probation_end_date' => '2022-10-25',
            ],
            [
                'name' => 'Vishnu Shaji',
                'dob' => '1994-03-11',
                'joining_date' => '2022-05-18',
                'probation_end_date' => '2022-11-18',
            ],
            [
                'name' => 'Justin Jose',
                'dob' => '1991-04-30',
                'joining_date' => '2022-07-04',
                'probation_end_date' => '2023-01-04',
            ],
            [
                'name' => 'Neethu Shaji',
                'dob' => '1999-07-14',
                'joining_date' => '2022-08-22',
                'probation_end_date' => '2023-02-22',
            ],
            [
                'name' => 'Ajay Babu N',
                'dob' => '1999-04-24',
                'joining_date' => '2022-12-19',
                'probation_end_date' => '2023-06-19',
            ],
            [
                'name' => 'Bindhu V',
                'dob' => '1992-02-21',
                'joining_date' => '2023-02-08',
                'probation_end_date' => '2023-08-08',
            ],
            [
                'name' => 'Abdullah Mohammedali',
                'dob' => '1999-02-04',
                'joining_date' => '2023-02-20',
                'probation_end_date' => '2023-08-20',
            ],
            [
                'name' => 'Jacob Binoy',
                'dob' => '1995-08-24',
                'joining_date' => '2023-03-27',
                'probation_end_date' => '2023-09-27',
            ],
            [
                'name' => 'Ameesha Helan O R',
                'dob' => '1997-10-28',
                'joining_date' => '2023-05-02',
                'probation_end_date' => '2023-11-02',
            ],
            [
                'name' => 'Suchith Lal',
                'dob' => '1998-09-10',
                'joining_date' => '2023-07-03',
                'probation_end_date' => '2024-01-03',
            ],
            [
                'name' => 'Abhiram P Mohan',
                'dob' => '1992-08-07',
                'joining_date' => '2023-07-11',
                'probation_end_date' => '2024-01-11',
            ],
            [
                'name' => 'Vaishnav Vijayan',
                'dob' => '1998-02-16',
                'joining_date' => '2023-07-26',
                'probation_end_date' => '2024-01-26',
            ],
            [
                'name' => 'Jishnu V Gopal',
                'dob' => '1997-09-10',
                'joining_date' => '2023-08-16',
                'probation_end_date' => '2024-02-16',
            ],
            [
                'name' => 'Athanasius Abram Punnoose',
                'dob' => '1989-06-30',
                'joining_date' => '2023-11-29',
                'probation_end_date' => '2024-05-29',
            ],
            [
                'name' => 'Anu Varghese',
                'dob' => '1993-04-21',
                'joining_date' => '2023-12-26',
                'probation_end_date' => '2024-06-26',
            ],
            [
                'name' => 'Amrutha Lakshmi',
                'dob' => '1996-10-08',
                'joining_date' => '2024-01-03',
                'probation_end_date' => '2024-07-03',
            ],
            [
                'name' => 'Mohammed Afsal K',
                'dob' => '1998-12-18',
                'joining_date' => '2024-02-05',
                'probation_end_date' => '2024-08-05',
            ],
            [
                'name' => 'Priya K',
                'dob' => '1999-04-15',
                'joining_date' => '2024-02-12',
                'probation_end_date' => '2024-08-12',
            ],
            [
                'name' => 'Mulashiya Sameer Gopalbhai',
                'dob' => '1992-03-04',
                'joining_date' => '2024-01-10',
                'probation_end_date' => '2024-07-10',
            ],
            [
                'name' => 'K Abish',
                'dob' => '2000-05-23',
                'joining_date' => '2024-02-26',
                'probation_end_date' => '2024-08-26',
            ],
            [
                'name' => 'Vishnupriya CP',
                'dob' => '1999-12-16',
                'joining_date' => '2024-03-18',
                'probation_end_date' => '2024-09-18',
            ],
            [
                'name' => 'Swetha G',
                'dob' => '1990-05-26',
                'joining_date' => '2024-03-26',
                'probation_end_date' => '2024-09-26',
            ],
            [
                'name' => 'Vishnu K K',
                'dob' => '2000-02-17',
                'joining_date' => '2024-03-26',
                'probation_end_date' => '2024-09-26',
            ],
            [
                'name' => 'Aswathi M',
                'dob' => '1995-07-20',
                'joining_date' => '2024-05-07',
                'probation_end_date' => '2024-11-07',
            ],
            [
                'name' => 'Kiran A G',
                'dob' => '1997-05-17',
                'joining_date' => '2024-05-08',
                'probation_end_date' => '2024-11-08',
            ],
            [
                'name' => 'Abhiram M V',
                'dob' => '2000-11-17',
                'joining_date' => '2024-05-20',
                'probation_end_date' => '2024-11-20',
            ],
            [
                'name' => 'Adiya Siyad',
                'dob' => '1997-07-09',
                'joining_date' => '2024-05-27',
                'probation_end_date' => '2024-11-27',
            ],
            [
                'name' => 'Ramees Nuhman',
                'dob' => '1999-12-17',
                'joining_date' => '2024-06-03',
                'probation_end_date' => '2024-12-03',
            ],
            [
                'name' => 'Joshua Johnson',
                'dob' => '2001-05-01',
                'joining_date' => '2024-07-29',
                'probation_end_date' => '2025-01-29',
            ],
            [
                'name' => 'Nikhitha M S',
                'dob' => '2002-06-27',
                'joining_date' => '2024-08-05',
                'probation_end_date' => '2025-02-05',
            ],
            [
                'name' => 'Sejal Sebastian',
                'dob' => '1996-05-30',
                'joining_date' => '2024-08-05',
                'probation_end_date' => '2025-02-05',
            ],
            [
                'name' => 'Sonu S',
                'dob' => '1999-04-02',
                'joining_date' => '2024-10-28',
                'probation_end_date' => '2025-04-28',
            ],
            [
                'name' => 'Bijith P N',
                'dob' => '2000-08-18',
                'joining_date' => '2024-12-09',
                'probation_end_date' => '2025-06-09',
            ],
            [
                'name' => 'Kiran P S',
                'dob' => '1994-03-10',
                'joining_date' => '2025-03-03',
                'probation_end_date' => '2025-09-03',
            ],
            [
                'name' => 'Alex Mariyan Sebastian',
                'dob' => '1997-10-16',
                'joining_date' => '2025-03-03',
                'probation_end_date' => '2025-09-03',
            ],
            [
                'name' => 'Shifna P S',
                'dob' => '1997-12-31',
                'joining_date' => '2025-03-10',
                'probation_end_date' => '2025-09-10',
            ],
            [
                'name' => 'Abhishek S',
                'dob' => '1997-12-12',
                'joining_date' => '2025-03-17',
                'probation_end_date' => '2025-09-17',
            ],
            [
                'name' => 'Nikesha Sony',
                'dob' => '2001-11-21',
                'joining_date' => '2025-03-17',
                'probation_end_date' => '2025-09-17',
            ],
            [
                'name' => 'Mavo Thomas',
                'dob' => '2001-12-04',
                'joining_date' => '2025-05-05',
                'probation_end_date' => '2025-11-05',
            ],
            [
                'name' => 'Divya K V',
                'dob' => '1994-09-09',
                'joining_date' => '2025-05-12',
                'probation_end_date' => '2025-11-12',
            ],
            [
                'name' => 'Alfiya Noori',
                'dob' => '2003-06-26',
                'joining_date' => '2025-05-26',
                'probation_end_date' => '2025-11-26',
            ],
            [
                'name' => 'Nikhil Govind O V',
                'dob' => '2003-04-16',
                'joining_date' => '2025-06-09',
                'probation_end_date' => '2025-12-09',
            ],
            [
                'name' => 'Milda E M',
                'dob' => '1996-11-18',
                'joining_date' => '2025-06-16',
                'probation_end_date' => '2025-12-16',
            ],
            [
                'name' => 'Meenakshi R',
                'dob' => '2002-09-28',
                'joining_date' => '2025-12-22',
                'probation_end_date' => '2026-06-22',
            ],
            [
                'name' => 'Sreelakshmi S Menon',
                'dob' => '2004-01-10',
                'joining_date' => '2026-01-29',
                'probation_end_date' => '2026-07-29',
            ],
            [
                'name' => 'Renjith R Krishnan',
                'dob' => '2000-11-11',
                'joining_date' => '2026-02-03',
                'probation_end_date' => '2026-08-03',
            ],
            [
                'name' => 'Amal Tomy',
                'dob' => '2000-04-04',
                'joining_date' => '2026-02-16',
                'probation_end_date' => '2026-08-16',
            ],
            [
                'name' => 'Vishnu Prasad M',
                'dob' => '2002-11-20',
                'joining_date' => '2026-02-16',
                'probation_end_date' => '2026-08-16',
            ],
            [
                'name' => 'Gautam Santhosh',
                'dob' => '1992-10-17',
                'joining_date' => '2026-03-09',
                'probation_end_date' => '2026-09-09',
            ],
            [
                'name' => 'Luquman Bin Abdulla',
                'dob' => '2001-04-12',
                'joining_date' => '2026-03-17',
                'probation_end_date' => '2026-09-17',
            ],
            [
                'name' => 'Jithin Wails',
                'dob' => '1990-05-02',
                'joining_date' => '2019-06-15',
                'probation_end_date' => '2019-12-15',
            ],
            [
                'name' => 'Rony G Umman',
                'dob' => '1985-02-04',
                'joining_date' => '2021-03-03',
                'probation_end_date' => '2021-09-03',
            ],
            [
                'name' => 'Jijo Jose',
                'dob' => '1991-10-25',
                'joining_date' => '2022-08-03',
                'probation_end_date' => '2023-02-03',
            ],
            [
                'name' => 'Bonies Doyal',
                'dob' => '1990-06-14',
                'joining_date' => '2021-06-23',
                'probation_end_date' => '2021-12-23',
            ],
            [
                'name' => 'Shaino Sajimon',
                'dob' => '2001-10-25',
                'joining_date' => '2024-02-21',
                'probation_end_date' => '2024-08-21',
            ],
        ];

        $updatedCount = 0;
        $unmatched = [];

        foreach ($employees as $emp) {
            $name = trim($emp['name']);
            $cleanName = strtolower(preg_replace('/[^a-z0-9]/', '', $name));

            // Find matching user by full name, stripped name, or individual names
            $user = DB::table('users')
                ->where(function ($query) use ($name, $cleanName) {
                    $query->whereRaw("LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = ?", [$cleanName])
                          ->orWhereRaw("LOWER(REPLACE(CONCAT(TRIM(COALESCE(last_name, '')), ' ', TRIM(first_name)), ' ', '')) = ?", [$cleanName])
                          ->orWhereRaw("LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = ?", [strtolower($name)]);
                })
                ->first();

            // Fallback for names with variations (e.g. "Aswathi M" vs "Aswathi M Ashok")
            if (!$user) {
                $user = DB::table('users')
                    ->where(function ($query) use ($cleanName) {
                        $query->whereRaw("LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE ?", ["{$cleanName}%"]);
                    })
                    ->first();
            }

            if ($user) {
                DB::table('users')
                    ->where('id', $user->id)
                    ->update([
                        'dob' => $emp['dob'],
                        'joining_date' => $emp['joining_date'],
                        'probation_end_date' => $emp['probation_end_date'],
                        'updated_at' => now(),
                    ]);
                $updatedCount++;
            } else {
                $unmatched[] = $name;
            }
        }

        Log::info("Employee DOB and Joining Date migration completed. Updated: {$updatedCount}, Unmatched: " . count($unmatched), [
            'unmatched' => $unmatched
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Data update migration, not strictly reversible
    }
};
