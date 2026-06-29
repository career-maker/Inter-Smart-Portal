<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Holiday;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Cache;

class HolidayController extends Controller
{
    /**
     * Display a listing of holidays.
     */
    public function index(Request $request)
    {
        $holidays = Cache::remember('all_holidays', now()->addHours(24), function () {
            return Holiday::orderBy('date', 'asc')->get();
        });
        return response()->json(['data' => $holidays]);
    }

    /**
     * Store a newly created holiday in storage.
     */
    public function store(Request $request)
    {
        // Ensure user is Super Admin or HR
        if (!in_array($request->user()->role, ['Super Admin', 'HR'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'date' => 'required|date',
            'type' => 'required|string|in:Public,Restricted,Company',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $holiday = Holiday::create([
            'name' => $request->name,
            'date' => $request->date,
            'type' => $request->type,
            'description' => $request->description,
        ]);

        Cache::forget('all_holidays');
        Cache::forget('dashboard_celebrations'); // In case holiday logic intertwines in future

        return response()->json(['message' => 'Holiday created successfully', 'data' => $holiday], 201);
    }

    /**
     * Update the specified holiday.
     */
    public function update(Request $request, Holiday $holiday)
    {
        if (!in_array($request->user()->role, ['Super Admin', 'HR'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'date' => 'required|date',
            'type' => 'required|string|in:Public,Restricted,Company',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $holiday->update([
            'name' => $request->name,
            'date' => $request->date,
            'type' => $request->type,
            'description' => $request->description,
        ]);

        Cache::forget('all_holidays');

        return response()->json(['message' => 'Holiday updated successfully', 'data' => $holiday]);
    }

    /**
     * Remove the specified holiday.
     */
    public function destroy(Request $request, Holiday $holiday)
    {
        if (!in_array($request->user()->role, ['Super Admin', 'HR'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $holiday->delete();
        Cache::forget('all_holidays');
        return response()->json(['message' => 'Holiday deleted successfully']);
    }
}
