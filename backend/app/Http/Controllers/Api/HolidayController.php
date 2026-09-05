<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Holiday;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Cache;

class HolidayController extends Controller
{
    private const ALLOWED_TYPES = [
        'National Holiday',
        'Festival Holiday',
        'Company Holiday',
        'Optional Holiday',
    ];

    public function index(Request $request)
    {
        $holidays = Cache::remember('all_holidays', now()->addHours(24), function () {
            return Holiday::orderBy('date', 'asc')->get();
        });
        return response()->json(['data' => $holidays]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name'        => 'required|string|max:255',
            'date'        => 'required|date',
            'type'        => 'required|string|in:' . implode(',', self::ALLOWED_TYPES),
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $holiday = Holiday::create([
            'name'        => $request->name,
            'date'        => $request->date,
            'type'        => $request->type,
            'description' => $request->description,
            'created_by'  => $request->user()->id,
        ]);

        Cache::forget('all_holidays');

        return response()->json(['message' => 'Holiday created successfully', 'data' => $holiday], 201);
    }

    public function update(Request $request, Holiday $holiday)
    {
        $validator = Validator::make($request->all(), [
            'name'        => 'required|string|max:255',
            'date'        => 'required|date',
            'type'        => 'required|string|in:' . implode(',', self::ALLOWED_TYPES),
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $holiday->update([
            'name'        => $request->name,
            'date'        => $request->date,
            'type'        => $request->type,
            'description' => $request->description,
            'updated_by'  => $request->user()->id,
        ]);

        Cache::forget('all_holidays');

        return response()->json(['message' => 'Holiday updated successfully', 'data' => $holiday]);
    }

    public function destroy(Request $request, Holiday $holiday)
    {
        $holiday->delete();
        Cache::forget('all_holidays');

        return response()->json(['message' => 'Holiday deleted successfully']);
    }

    public function seedKeralaHolidays(Request $request)
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

        $userId = $request->user()?->id ?? 1;
        $createdCount = 0;

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
                    'created_by'  => $userId,
                ]);
                $createdCount++;
            }
        }

        Cache::forget('all_holidays');

        return response()->json([
            'message' => "Successfully processed Kerala bank holidays ({$createdCount} new added).",
            'added_count' => $createdCount,
            'data' => Holiday::orderBy('date', 'asc')->get(),
        ]);
    }

    public function getOverrides()
    {
        $overrides = \App\Models\WorkingDaysOverride::orderBy('date', 'desc')->get();
        return response()->json(['data' => $overrides]);
    }

    public function storeOverride(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'date'   => 'required|date',
            'reason' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $formattedDate = \Carbon\Carbon::parse($request->date)->format('Y-m-d');

        $override = \App\Models\WorkingDaysOverride::updateOrCreate(
            ['date' => $formattedDate],
            ['reason' => $request->reason ?? 'Admin Working Day Override']
        );

        return response()->json([
            'message' => 'Working day override saved successfully',
            'data' => $override,
        ], 201);
    }

    public function destroyOverride($id)
    {
        $override = \App\Models\WorkingDaysOverride::find($id);
        if (!$override) {
            $override = \App\Models\WorkingDaysOverride::where('date', $id)->first();
        }

        if ($override) {
            $override->delete();
        }

        return response()->json(['message' => 'Working day override removed successfully']);
    }
}
