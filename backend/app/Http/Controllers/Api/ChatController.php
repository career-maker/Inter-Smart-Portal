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
     * Get the compiled AI Chat system prompt context.
     */
    public function context(Request $request)
    {
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

        // 3. Fetch Teams and Leads (relationship is teamLead() on Team model)
        try {
            $teams = Team::with('teamLead')->get()->map(function($team) {
                $leadName = $team->teamLead ? "{$team->teamLead->first_name} {$team->teamLead->last_name}" : "No Team Lead assigned";
                return "- Team: {$team->name}, Team Lead: {$leadName}";
            })->toArray();
        } catch (\Exception $e) {
            $teams = [];
        }
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

        return response()->json([
            'status' => 'success',
            'system_prompt' => $systemPrompt,
            'model' => env('OLLAMA_MODEL', 'llama3.2')
        ]);
    }

    /**
     * Handle incoming chat requests and proxy them to Gemini (or fallback to local Ollama) with live context.
     */
    public function store(Request $request)
    {
        $request->validate([
            'message' => ['required', 'string', 'max:1000'],
            'history' => ['nullable', 'array'],
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

        // 3. Fetch Teams and Leads (relationship is teamLead() on Team model)
        try {
            $teams = Team::with('teamLead')->get()->map(function($team) {
                $leadName = $team->teamLead ? "{$team->teamLead->first_name} {$team->teamLead->last_name}" : "No Team Lead assigned";
                return "- Team: {$team->name}, Team Lead: {$leadName}";
            })->toArray();
        } catch (\Exception $e) {
            $teams = [];
        }
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

        // 6. Connect to Cloud Gemini API or fallback to local Ollama
        $apiKey = env('GEMINI_API_KEY');

        if ($apiKey) {
            // Build the contents array with chat history for Gemini
            $contents = [];
            $history = $request->input('history', []);
            foreach ($history as $msg) {
                // Map 'user' and 'bot' messages to Gemini roles ('user' and 'model')
                $role = ($msg['sender'] === 'user') ? 'user' : 'model';
                $contents[] = [
                    'role' => $role,
                    'parts' => [
                        ['text' => $msg['text']]
                    ]
                ];
            }

            // Append the latest user query
            $contents[] = [
                'role' => 'user',
                'parts' => [
                    ['text' => $request->input('message')]
                ]
            ];

            $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$apiKey}";

            try {
                $response = Http::timeout(20)->post($url, [
                    'contents' => $contents,
                    'systemInstruction' => [
                        'parts' => [
                            ['text' => $systemPrompt]
                        ]
                    ]
                ]);

                if ($response->successful()) {
                    $responseData = $response->json();
                    $reply = $responseData['candidates'][0]['content']['parts'][0]['text'] ?? 'No reply received from cloud assistant.';
                    return response()->json([
                        'status' => 'success',
                        'reply' => $reply
                    ]);
                }

                $geminiError = $response->json('error.message') ?? $response->body();
                \Illuminate\Support\Facades\Log::error('Gemini API error', [
                    'status' => $response->status(),
                    'body' => $geminiError,
                ]);
                return response()->json([
                    'status' => 'error',
                    'message' => 'Cloud AI service (Gemini) returned an error: ' . $geminiError
                ], 502);

            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Gemini connection error', ['msg' => $e->getMessage()]);
                return response()->json([
                    'status' => 'error',
                    'message' => 'Could not connect to the Cloud AI service: ' . $e->getMessage()
                ], 503);
            }
        }

        // Fallback: Local Ollama
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
                'message' => 'No Cloud AI API key configured, and could not connect to local Ollama. Please ensure GEMINI_API_KEY is configured in your server environment.'
            ], 503);
        }
    }
}
