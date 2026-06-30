<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Recognition;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class RecognitionController extends Controller
{
    public function index()
    {
        $recognitions = Recognition::with(['user:id,first_name,last_name,employee_id', 'creator:id,first_name,last_name'])
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json(['data' => $recognitions]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'title' => 'required|string|max:255',
            'is_custom' => 'boolean',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'description' => 'required|string',
            'icon' => 'nullable|string',
        ]);

        $recognition = Recognition::create([
            'user_id' => $validated['user_id'],
            'title' => $validated['title'],
            'is_custom' => $validated['is_custom'] ?? false,
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'description' => $validated['description'],
            'icon' => $validated['icon'] ?? null,
            'is_active' => true,
            'created_by' => Auth::id(),
        ]);

        return response()->json(['message' => 'Recognition added successfully.', 'data' => $recognition]);
    }

    public function update(Request $request, $id)
    {
        $recognition = Recognition::findOrFail($id);

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'title' => 'required|string|max:255',
            'is_custom' => 'boolean',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'description' => 'required|string',
            'icon' => 'nullable|string',
        ]);

        $recognition->update($validated);

        return response()->json(['message' => 'Recognition updated successfully.', 'data' => $recognition]);
    }

    public function toggleActive($id)
    {
        $recognition = Recognition::findOrFail($id);
        $recognition->is_active = !$recognition->is_active;
        $recognition->save();

        return response()->json(['message' => 'Recognition status toggled.', 'data' => $recognition]);
    }

    public function destroy($id)
    {
        $recognition = Recognition::findOrFail($id);
        $recognition->delete();

        return response()->json(['message' => 'Recognition deleted.']);
    }

    public function activeRecognitions()
    {
        $today = Carbon::today()->toDateString();

        $recognitions = Recognition::with(['user:id,first_name,last_name,employee_id'])
            ->where('is_active', true)
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->get();

        return response()->json(['data' => $recognitions]);
    }

    public function myRecognitions()
    {
        $recognitions = Recognition::where('user_id', Auth::id())
            ->orderBy('start_date', 'desc')
            ->get();
            
        return response()->json(['data' => $recognitions]);
    }
}
