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
}
