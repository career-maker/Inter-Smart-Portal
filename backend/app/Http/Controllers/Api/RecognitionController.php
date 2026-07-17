<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Recognition;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class RecognitionController extends Controller
{
    public function index()
    {
        $recognitions = Recognition::with(['user:id,first_name,last_name,employee_code', 'creator:id,first_name,last_name'])
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

        $recognition->load(['user:id,first_name,last_name,employee_code,email,designation,team_id', 'user.team:id,name', 'creator:id,first_name,last_name']);

        try {
            $employee = \App\Models\User::find($recognition->user_id);
            if ($employee) {
                $creatorName = Auth::user() ? (Auth::user()->first_name . ' ' . Auth::user()->last_name) : 'Management';
                $message = "Congratulations! You have been awarded the \"{$recognition->title}\" achievement by {$creatorName}.";
                $employee->notify(new \App\Notifications\RecognitionNotification($recognition, $message));
            }
        } catch (\Exception $e) {
            // Never let notification failure block saving
        }

        // Send email notification (isolated, failures don't affect recognition creation)
        try {
            $employee = \App\Models\User::find($recognition->user_id);
            if ($employee) {
                \App\Services\Email\EmailService::sendRecognitionEmail($employee, $recognition);
            }
        } catch (\Exception $e) {
            // Log but don't fail
            \Log::warning('Recognition email notification failed: ' . $e->getMessage());
        }

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
        $today = Carbon::today('Asia/Kolkata')->toDateString();

        $recognitions = Recognition::with(['user:id,first_name,last_name,employee_code'])
            ->where('is_active', true)
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->get();

        return response()->json(['data' => $recognitions]);
    }

    public function myRecognitions(\Illuminate\Http\Request $request)
    {
        $userId = $request->query('user_id', Auth::id());
        $recognitions = Recognition::where('user_id', $userId)
            ->with(['creator:id,first_name,last_name'])
            ->orderBy('start_date', 'desc')
            ->get();
            
        return response()->json(['data' => $recognitions]);
    }

    /**
     * Recognition Leaderboard — all authenticated users can view.
     * period=overall (default) or period=week
     */
    public function leaderboard(Request $request)
    {
        $period = $request->query('period', 'overall');
        $today  = Carbon::today('Asia/Kolkata')->toDateString();

        $query = Recognition::query()->where('is_active', true);

        if ($period === 'week') {
            $weekStart = Carbon::now()->startOfWeek(Carbon::MONDAY)->toDateString();
            $weekEnd   = Carbon::now()->endOfWeek(Carbon::SUNDAY)->toDateString();
            // Recognitions that overlap with the current week
            $query->where('start_date', '<=', $weekEnd)
                  ->where('end_date', '>=', $weekStart);
        }

        $recognitions = $query
            ->with([
                'user:id,first_name,last_name,designation,team_id,profile_photo_path,joining_date',
                'user.team:id,name',
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        // Group by user
        $grouped = $recognitions->groupBy('user_id');

        $leaderboard = $grouped->map(function ($recs, $userId) use ($today) {
            $firstRec = $recs->first();
            $user = $firstRec ? $firstRec->user : null;
            if (!$user) return null;

            $latestRec = $recs->sortByDesc('created_at')->first();

            $activeRec = $recs->first(function ($r) use ($today) {
                return $r->start_date->toDateString() <= $today
                    && $r->end_date->toDateString() >= $today;
            });

            return [
                'user_id'                  => $userId,
                'name'                     => $user->first_name . ' ' . $user->last_name,
                'first_name'               => $user->first_name,
                'last_name'                => $user->last_name,
                'designation'              => $user->designation ?? 'Employee',
                'department'               => $user->team?->name ?? 'Unassigned',
                'profile_photo_path'       => $user->profilePhotoUrl(),
                'total_achievements'       => $recs->count(),
                'latest_achievement_title' => $latestRec?->title,
                'latest_achievement_icon'  => $latestRec?->icon,
                'active_achievement'       => $activeRec ? [
                    'title' => $activeRec->title,
                    'icon'  => $activeRec->icon,
                ] : null,
                'joining_date'             => $user->joining_date,
            ];
        })->filter()->values();

        // Sort: most achievements first, then by joining date (earliest = more senior)
        $leaderboard = $leaderboard->sortBy([
            ['total_achievements', 'desc'],
            ['joining_date', 'asc'],
        ])->values();

        // Assign ranks
        $leaderboard = $leaderboard->map(function ($item, $index) {
            return array_merge($item, ['rank' => $index + 1]);
        })->values();

        // Summary stats (always overall regardless of period filter)
        $totalIssued   = Recognition::count();
        $activeHolders = Recognition::where('is_active', true)
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->distinct('user_id')
            ->count('user_id');

        $topEntry = $leaderboard->first();

        $mostAwardedRow = Recognition::selectRaw('title, icon, COUNT(*) as award_count')
            ->groupBy('title', 'icon')
            ->orderByDesc('award_count')
            ->first();

        return response()->json([
            'data'  => $leaderboard,
            'stats' => [
                'total_issued'   => $totalIssued,
                'active_holders' => $activeHolders,
                'top_performer'  => $topEntry ? $topEntry['name'] : null,
                'top_performer_designation' => $topEntry ? $topEntry['designation'] : null,
                'most_awarded'   => $mostAwardedRow ? ($mostAwardedRow->icon . ' ' . $mostAwardedRow->title) : null,
            ],
        ]);
    }

    /**
     * Get all recognitions for a specific employee (Super Admin only).
     */
    public function employeeRecognitions($userId)
    {
        $employee = User::findOrFail($userId);

        $recognitions = Recognition::where('user_id', $userId)
            ->with(['creator:id,first_name,last_name'])
            ->orderBy('start_date', 'desc')
            ->get();

        return response()->json([
            'data'     => $recognitions,
            'employee' => [
                'id'         => $employee->id,
                'name'       => $employee->first_name . ' ' . $employee->last_name,
                'designation' => $employee->designation,
            ],
        ]);
    }
}
