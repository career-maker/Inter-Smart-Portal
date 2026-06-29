<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class LeaveTypeController extends Controller
{
    public function index()
    {
        $types = Cache::remember('all_leave_types', now()->addHours(24), function () {
            return LeaveType::all();
        });

        return response()->json([
            'data' => $types
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string',
            'is_paid' => 'boolean',
            'days_allowed_per_year' => 'required|integer|min:0'
        ]);

        $leaveType = LeaveType::create($validated);
        
        Cache::forget('all_leave_types');

        return response()->json([
            'message' => 'Leave type created successfully',
            'data' => $leaveType
        ], 201);
    }

    public function show(LeaveType $leaveType)
    {
        return response()->json([
            'data' => $leaveType
        ]);
    }

    public function update(Request $request, LeaveType $leaveType)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string',
            'is_paid' => 'boolean',
            'days_allowed_per_year' => 'required|integer|min:0'
        ]);

        $leaveType->update($validated);
        
        Cache::forget('all_leave_types');

        return response()->json([
            'message' => 'Leave type updated successfully',
            'data' => $leaveType
        ]);
    }

    public function destroy(LeaveType $leaveType)
    {
        $leaveType->delete();
        Cache::forget('all_leave_types');
        return response()->json(['message' => 'Leave type deleted successfully']);
    }
}
