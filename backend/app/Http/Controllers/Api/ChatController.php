<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Carbon\Carbon;
use App\Models\Team;
use App\Models\Holiday;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;

class ChatController extends Controller
{
    /**
     * Handle incoming chat requests and proxy them to Ollama with live context.
     */
    public function store(Request $request)
    {
        $request->validate([
            'message' => ['required', 'string', 'max:1000'],
        ]);

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $today = Carbon::today();

        // 1. Fetch Leave Balances for current user
        $balances = LeaveBalance::where('user_id', $user->id)->first();
        $balanceText = $balances 
            ? "Casual Leaves remaining: {$balances->casual_leave_balance}, Sick Leaves remaining: {$balances->sick_leave_balance}, Total taken: {$balances->total_leaves_taken}."
            : "No active leave balance records found.";

        // 2. Fetch today's approved leaves
        $leavesToday = LeaveRequest::where('status', 'Approved')
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->with('user')
            ->get()
            ->map(fn($lr) => ($lr->user ? "{$lr->user->first_name} {$lr->user->last_name}" : "Unknown") . " (Type: {$lr->leave_type})")
            ->toArray();
        $leavesTodayText = empty($leavesToday) 
            ? "Nobody is on leave today." 
            : "Employees on leave today: " . implode(', ', $leavesToday) . ".";

        // 3. Fetch Teams and Leads
        $teams = Team::with('lead')->get()->map(function($team) {
            $leadName = $team->lead ? "{$team->lead->first_name} {$team->lead->last_name}" : "No Team Lead assigned";
            return "- Team: {$team->name}, Team Lead: {$leadName}";
        })->toArray();
        $teamsText = empty($teams)
            ? "No teams or departments registered."
            : implode("\n", $teams);

        // 4. Fetch upcoming holidays
        $holidays = Holiday::whereDate('date', '>=', $today)
            ->orderBy('date')
            ->take(5)
            ->get()
            ->map(fn($h) => "- {$h->name} on " . Carbon::parse($h->date)->format('d M Y'))
            ->toArray();
        $holidaysText = empty($holidays)
            ? "No upcoming holidays registered."
            : implode("\n", $holidays);

        // 5. Compile system prompt
        $systemPrompt = "You are the Inter Smart Employee Portal AI Assistant. Your role is to answer questions about the portal, including leave applications, who is on leave today, team leads / departments, holidays, and user profiles.

Use the following real-time data from the database to answer queries:
- Current User: {$user->first_name} {$user->last_name} (Email: {$user->email}, Employee ID: {$user->employee_code}, Designation: {$user->designation})
- Current Date/Time: " . Carbon::now()->format('l, d F Y h:i A') . "
- Your Leave Balances: {$balanceText}
- Today's Leaves: {$leavesTodayText}
- Teams & Team Leads:
{$teamsText}
- Upcoming Holidays:
{$holidaysText}

GUIDELINES & NAVIGATION LINKS:
- To apply for a leave: Direct the user to the Apply Leave page at link `/leaves/apply`.
- To view attendance (punch in/out): Direct the user to the Attendance page at link `/attendance`.
- To view profile details: Direct the user to the Profile page at link `/profile`.
- To view leaves calendar: Direct the user to the Calendar page at link `/calendar`.
- To view company policies: Direct the user to the Policies page at link `/policies`.

CRITICAL INSTRUCTIONS:
1. You are strictly READ-ONLY. You cannot perform CRUD actions. You cannot apply for a leave, approve a request, update a profile, or make any changes to the database. If the user asks you to do so, decline politely and explain how they can do it themselves using the links above.
2. Answer queries in a professional, concise, and friendly manner.
3. Keep answers compact, direct, and under 3-4 sentences when possible.
4. If the user asks about something not available in the context, do your best to answer generally or advise them to contact HR.";

        // 6. Connect to Ollama API
        $url = env('OLLAMA_API_URL', 'http://127.0.0.1:11434');
        $model = env('OLLAMA_MODEL', 'llama3.2');

        try {
            $response = Http::timeout(20)->post("{$url}/api/chat", [
                'model' => $model,
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => $request->input('message')],
                ],
                'stream' => false,
            ]);

            if ($response->successful()) {
                $responseData = $response->json();
                return response()->json([
                    'status' => 'success',
                    'reply' => $responseData['message']['content'] ?? 'No reply received from AI model.'
                ]);
            }

            return response()->json([
                'status' => 'error',
                'message' => 'Ollama service returned an error status: ' . $response->status()
            ], 502);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Could not connect to the local AI assistant. Please ensure Ollama is running locally at http://127.0.0.1:11434 with model ' . $model . ' installed.'
            ], 503);
        }
    }
}
