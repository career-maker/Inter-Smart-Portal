<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\Holiday;
use Illuminate\Support\Facades\Cache;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Pre-populates official Kerala Bank / Public Holidays for 2026.
     */
    public function up(): void
    {
        $keralaHolidays2026 = [
            [
                'name' => 'Republic Day',
                'date' => '2026-01-26',
                'type' => 'National Holiday',
                'description' => 'Celebration of the Constitution of India',
            ],
            [
                'name' => 'Maha Shivratri',
                'date' => '2026-02-15',
                'type' => 'Festival Holiday',
                'description' => 'Maha Shivratri festival',
            ],
            [
                'name' => 'Id-ul-Fitr (Ramzan)',
                'date' => '2026-03-21',
                'type' => 'Festival Holiday',
                'description' => 'End of Ramadan / Eid-ul-Fitr',
            ],
            [
                'name' => 'Maundy Thursday',
                'date' => '2026-04-02',
                'type' => 'Festival Holiday',
                'description' => 'Holy Thursday / Maundy Thursday',
            ],
            [
                'name' => 'Good Friday',
                'date' => '2026-04-03',
                'type' => 'Festival Holiday',
                'description' => 'Good Friday',
            ],
            [
                'name' => 'Vishu / Dr. B.R. Ambedkar Jayanthi',
                'date' => '2026-04-14',
                'type' => 'Festival Holiday',
                'description' => 'Kerala New Year (Vishu) & Ambedkar Jayanthi',
            ],
            [
                'name' => 'May Day',
                'date' => '2026-05-01',
                'type' => 'Company Holiday',
                'description' => 'International Workers\' Day',
            ],
            [
                'name' => 'Bakrid (Id-ul-Adha)',
                'date' => '2026-05-27',
                'type' => 'Festival Holiday',
                'description' => 'Feast of the Sacrifice',
            ],
            [
                'name' => 'Muharram',
                'date' => '2026-06-26',
                'type' => 'Festival Holiday',
                'description' => 'Islamic New Year / Muharram',
            ],
            [
                'name' => 'Independence Day',
                'date' => '2026-08-15',
                'type' => 'National Holiday',
                'description' => 'Indian Independence Day',
            ],
            [
                'name' => 'First Onam (Uthradam)',
                'date' => '2026-08-26',
                'type' => 'Festival Holiday',
                'description' => 'First Onam (Uthradam)',
            ],
            [
                'name' => 'Thiruvonam',
                'date' => '2026-08-27',
                'type' => 'Festival Holiday',
                'description' => 'Thiruvonam - Kerala State Festival',
            ],
            [
                'name' => 'Third Onam (Avittom)',
                'date' => '2026-08-28',
                'type' => 'Festival Holiday',
                'description' => 'Third Onam (Avittom)',
            ],
            [
                'name' => 'Sree Narayana Guru Jayanthi',
                'date' => '2026-08-29',
                'type' => 'Festival Holiday',
                'description' => 'Sree Narayana Guru Jayanthi celebration',
            ],
            [
                'name' => 'Milad-i-Sherif (Nabi Dinam)',
                'date' => '2026-09-04',
                'type' => 'Festival Holiday',
                'description' => 'Milad-i-Sherif (Prophet\'s Birthday)',
            ],
            [
                'name' => 'Sree Narayana Guru Samadhi',
                'date' => '2026-09-21',
                'type' => 'Festival Holiday',
                'description' => 'Sree Narayana Guru Samadhi Day',
            ],
            [
                'name' => 'Gandhi Jayanthi',
                'date' => '2026-10-02',
                'type' => 'National Holiday',
                'description' => 'Mahatma Gandhi Jayanthi',
            ],
            [
                'name' => 'Mahanavami / Ayudha Pooja',
                'date' => '2026-10-19',
                'type' => 'Festival Holiday',
                'description' => 'Mahanavami & Ayudha Pooja',
            ],
            [
                'name' => 'Vijayadashami',
                'date' => '2026-10-20',
                'type' => 'Festival Holiday',
                'description' => 'Vijayadashami (Vidyarambham)',
            ],
            [
                'name' => 'Deepavali (Diwali)',
                'date' => '2026-11-08',
                'type' => 'Festival Holiday',
                'description' => 'Festival of Lights (Deepavali)',
            ],
            [
                'name' => 'Christmas',
                'date' => '2026-12-25',
                'type' => 'Festival Holiday',
                'description' => 'Christmas Celebration',
            ],
        ];

        foreach ($keralaHolidays2026 as $item) {
            $exists = Holiday::where('date', $item['date'])
                ->orWhere(function ($query) use ($item) {
                    $query->where('name', $item['name'])->whereYear('date', 2026);
                })
                ->exists();

            if (!$exists) {
                Holiday::create([
                    'name'        => $item['name'],
                    'date'        => $item['date'],
                    'type'        => $item['type'],
                    'description' => $item['description'],
                    'created_by'  => 1,
                ]);
            }
        }

        Cache::forget('all_holidays');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Safe down migration: do not force delete user-customized holidays
    }
};
