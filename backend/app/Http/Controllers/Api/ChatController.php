<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use App\Models\User;
use App\Models\Team;
use App\Models\Holiday;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\Attendance;
use App\Models\BiometricEvent;
use App\Models\WfhRequest;

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

        $systemPrompt = $this->buildSystemPrompt($user);

        return response()->json([
            'status' => 'success',
            'system_prompt' => $systemPrompt,
            'model' => config('services.gemini.model', 'gemini-2.5-flash')
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

        $systemPrompt = $this->buildSystemPrompt($user);

        // Connect to Cloud Gemini API or fallback to local Ollama
        $apiKey = config('services.gemini.api_key') ?: env('GEMINI_API_KEY');

        if ($apiKey) {
            // Build the contents array with chat history for Gemini
            $contents = [];
            $history = $request->input('history', []);
            foreach ($history as $msg) {
                if (empty($msg['text']) || empty($msg['sender'])) {
                    continue;
                }
                $role = ($msg['sender'] === 'user') ? 'user' : 'model';
                $contents[] = [
                    'role' => $role,
                    'parts' => [
                        ['text' => (string) $msg['text']]
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

            $modelName = config('services.gemini.model', 'gemini-2.5-flash');
            $url = "https://generativelanguage.googleapis.com/v1beta/models/{$modelName}:generateContent?key={$apiKey}";

            try {
                $response = Http::timeout(25)->post($url, [
                    'contents' => $contents,
                    'systemInstruction' => [
                        'parts' => [
                            ['text' => $systemPrompt]
                        ]
                    ]
                ]);

                if ($response->successful()) {
                    $responseData = $response->json();
                    $reply = $responseData['candidates'][0]['content']['parts'][0]['text'] ?? 'No reply received from AI assistant.';
                    return response()->json([
                        'status' => 'success',
                        'reply' => $reply
                    ]);
                }

                $geminiError = $response->json('error.message') ?? $response->body();
                Log::error('Gemini API error', [
                    'status' => $response->status(),
                    'body' => $geminiError,
                ]);
                return response()->json([
                    'status' => 'error',
                    'message' => 'Cloud AI service (Gemini) returned an error: ' . $geminiError
                ], 502);

            } catch (\Exception $e) {
                Log::error('Gemini connection error', ['msg' => $e->getMessage()]);
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
            $response = Http::timeout(25)->post("{$url}/api/chat", [
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
                'message' => 'No Cloud AI API key configured (GEMINI_API_KEY), and could not connect to local Ollama fallback.'
            ], 503);
        }
    }

    /**
     * Build the role-scoped system prompt with live DB context.
     * Enforces strict data isolation for employees while empowering Team Leads with teammate data.
     */
    private function buildSystemPrompt(User $user): string
    {
        $today = Carbon::today('Asia/Kolkata');
        $todayStr = $today->toDateString();
        $nowFormatted = Carbon::now('Asia/Kolkata')->format('l, d F Y h:i A');

        // 1. Determine User Role
        $isSuperAdmin = $user->hasRole('Super Admin') || strtolower($user->role ?? '') === 'super admin';
        $isHR = $user->hasRole('HR') || strtolower($user->role ?? '') === 'hr';
        $isTeamLead = $user->hasRole('Team Lead')
            || Team::where('team_lead_id', $user->id)->exists()
            || strtolower($user->role ?? '') === 'team lead'
            || str_contains(strtolower($user->designation ?? ''), 'lead');

        if ($isSuperAdmin) {
            $roleName = 'Super Admin';
        } elseif ($isHR) {
            $roleName = 'HR';
        } elseif ($isTeamLead) {
            $roleName = 'Team Lead';
        } else {
            $roleName = 'Employee';
        }

        // 2. User's Own Leave Balances
        $balances = LeaveBalance::where('user_id', $user->id)->first();
        $balanceText = $balances 
            ? "Casual Leaves remaining: {$balances->casual_leave_balance}, Sick Leaves remaining: {$balances->sick_leave_balance}, Total taken this year: {$balances->total_leaves_taken}."
            : "No active leave balance records found.";

        // 3. User's Own Recent Leave Requests & Current Statuses
        $myLeaves = LeaveRequest::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->take(5)
            ->get()
            ->map(function ($lr) {
                $start = Carbon::parse($lr->start_date)->format('d M Y');
                $end = Carbon::parse($lr->end_date)->format('d M Y');
                $notes = $lr->admin_remarks ? " [Note: {$lr->admin_remarks}]" : "";
                return "- {$lr->leave_type} ({$start} to {$end}): Status = {$lr->status}{$notes}";
            })
            ->toArray();
        $myLeavesText = empty($myLeaves) 
            ? "No recent leave applications submitted." 
            : implode("\n", $myLeaves);

        // 4. Approved Leaves for Today (General Organization Attendance Roster)
        $leavesToday = LeaveRequest::where('status', 'Approved')
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->with('user:id,first_name,last_name')
            ->get()
            ->map(fn($lr) => ($lr->user ? "{$lr->user->first_name} {$lr->user->last_name}" : "Staff") . " ({$lr->leave_type})")
            ->toArray();
        $leavesTodayText = empty($leavesToday) 
            ? "Nobody is on leave today." 
            : "Employees on approved leave today: " . implode(', ', $leavesToday) . ".";

        // 5. Teams and Team Leads
        try {
            $teams = Team::with('teamLead:id,first_name,last_name')->get()->map(function($team) {
                $leadName = $team->teamLead ? "{$team->teamLead->first_name} {$team->teamLead->last_name}" : "No Team Lead assigned";
                return "- Team: {$team->name} | Team Lead: {$leadName}";
            })->toArray();
        } catch (\Exception $e) {
            $teams = [];
        }
        $teamsText = empty($teams) ? "No teams or departments registered." : implode("\n", $teams);

        // 6. Upcoming Holidays
        $holidays = Holiday::whereDate('date', '>=', $today)
            ->orderBy('date')
            ->take(5)
            ->get()
            ->map(fn($h) => "- {$h->name} on " . Carbon::parse($h->date)->format('l, d M Y'))
            ->toArray();
        $holidaysText = empty($holidays) ? "No upcoming holidays registered." : implode("\n", $holidays);

        // 7. Determine Team IDs for Team Lead
        $leadTeamIds = [];
        $teammateIds = [];
        if ($isTeamLead) {
            $leadTeamIds = Team::where('team_lead_id', $user->id)->pluck('id')->toArray();
            if ($user->team_id && !in_array($user->team_id, $leadTeamIds)) {
                $leadTeamIds[] = $user->team_id;
            }
            try {
                $teammateIds = User::whereIn('team_id', $leadTeamIds)
                    ->where('id', '!=', $user->id)
                    ->where('status', 'Active')
                    ->pluck('id')
                    ->toArray();
            } catch (\Exception $e) {
                $teammateIds = [];
            }
        }

        // 8. Active Tasks & Assignments (Loaded before roster to map user active tasks)
        $userTasksMap = [];
        try {
            $taskQuery = ProjectTask::query()
                ->whereNotIn('status', ['Completed', 'Rejected'])
                ->with(['project:id,name', 'assignees:id,first_name,last_name']);

            if ($isSuperAdmin || $isHR) {
                // Admin sees company-wide active tasks (take up to 100)
                $tasks = $taskQuery->orderBy('due_date')->take(100)->get();
            } elseif ($isTeamLead) {
                $allTeamUserIds = array_merge([$user->id], $teammateIds);
                $tasks = $taskQuery->where(function ($q) use ($leadTeamIds, $allTeamUserIds) {
                    if (!empty($leadTeamIds)) {
                        $q->whereIn('team_id', $leadTeamIds);
                    }
                    $q->orWhereHas('assignees', fn ($a) => $a->whereIn('users.id', $allTeamUserIds));
                })->orderBy('due_date')->take(60)->get();
            } else {
                // Regular Employee sees ONLY their own assigned tasks
                $tasks = $taskQuery->whereHas('assignees', fn ($a) => $a->where('users.id', $user->id))
                    ->orderBy('due_date')->take(20)->get();
            }

            foreach ($tasks as $t) {
                $projName = $t->project ? $t->project->name : 'General';
                foreach ($t->assignees as $assignee) {
                    $userTasksMap[$assignee->id][] = "{$t->title} [Project: {$projName}, Status: {$t->status}]";
                }
            }

            $formattedTasks = $tasks->map(function ($t) {
                $projName = $t->project ? $t->project->name : 'General';
                $assigneeNames = $t->assignees->map(fn($u) => "{$u->first_name} {$u->last_name}")->toArray();
                $assigneeText = empty($assigneeNames) ? 'Unassigned' : implode(', ', $assigneeNames);
                $dueText = $t->due_date ? Carbon::parse($t->due_date)->format('d M Y') : 'No due date';
                $priority = $t->priority ?? 'Medium';
                return "- Task: \"{$t->title}\" [Project: {$projName} | Status: {$t->status} | Priority: {$priority} | Due: {$dueText}]\n  Assignees: {$assigneeText}";
            })->toArray();

            $tasksText = empty($formattedTasks)
                ? "No active task assignments found."
                : implode("\n\n", $formattedTasks);
        } catch (\Exception $e) {
            $tasksText = "Task assignment details unavailable.";
        }

        // 9. Employee Roster & Today's Live Attendance Status
        $rosterSection = "";
        try {
            if ($isSuperAdmin || $isHR) {
                // Super Admin / HR: Full company active employee roster with today's live attendance & tasks
                $employees = User::where('status', 'Active')
                    ->with('team:id,name')
                    ->orderBy('first_name')
                    ->get(['id', 'first_name', 'last_name', 'employee_code', 'designation', 'team_id']);

                $attendancesToday = Attendance::where('date', $todayStr)
                    ->get(['user_id', 'check_in_time', 'check_out_time', 'status', 'total_working_minutes'])
                    ->keyBy('user_id');

                $biometricInToday = BiometricEvent::whereNotNull('user_id')
                    ->whereDate('local_punch_time', $todayStr)
                    ->where('direction', 'in')
                    ->orderBy('local_punch_time')
                    ->get(['user_id', 'local_punch_time'])
                    ->groupBy('user_id');

                $approvedLeavesToday = LeaveRequest::where('status', 'Approved')
                    ->whereDate('start_date', '<=', $today)
                    ->whereDate('end_date', '>=', $today)
                    ->pluck('leave_type', 'user_id')
                    ->toArray();

                $approvedWfhToday = [];
                try {
                    $approvedWfhToday = WfhRequest::where('status', 'Approved')
                        ->where(function ($q) use ($todayStr) {
                            $q->whereDate('wfh_date', $todayStr)
                              ->orWhere(function ($q2) use ($todayStr) {
                                  $q2->whereDate('start_date', '<=', $todayStr)
                                     ->whereDate('end_date', '>=', $todayStr);
                              });
                        })
                        ->pluck('status', 'user_id')
                        ->toArray();
                } catch (\Exception $wfhEx) {
                    $approvedWfhToday = [];
                }

                $presentCount = 0;
                $leaveCount = 0;
                $wfhCount = 0;
                $absentCount = 0;

                $empRows = $employees->map(function ($emp) use (
                    $attendancesToday,
                    $biometricInToday,
                    $approvedLeavesToday,
                    $approvedWfhToday,
                    $userTasksMap,
                    &$presentCount,
                    &$leaveCount,
                    &$wfhCount,
                    &$absentCount
                ) {
                    $att = $attendancesToday->get($emp->id);
                    $bioPunches = $biometricInToday->get($emp->id);
                    $leaveType = $approvedLeavesToday[$emp->id] ?? null;
                    $isWfh = isset($approvedWfhToday[$emp->id]);

                    if ($leaveType) {
                        $leaveCount++;
                        $status = "On Leave ({$leaveType})";
                    } elseif ($isWfh) {
                        $wfhCount++;
                        $status = "Work From Home (Approved WFH)";
                    } elseif ($att && $att->check_in_time) {
                        $presentCount++;
                        $checkInTime = Carbon::parse($att->check_in_time)->format('h:i A');
                        if ($att->check_out_time) {
                            $checkOutTime = Carbon::parse($att->check_out_time)->format('h:i A');
                            $status = "Present (Checked In: {$checkInTime}, Checked Out: {$checkOutTime})";
                        } else {
                            $status = "Present in Office (Checked In: {$checkInTime})";
                        }
                    } elseif ($bioPunches && $bioPunches->isNotEmpty()) {
                        $presentCount++;
                        $firstPunch = Carbon::parse($bioPunches->first()->local_punch_time)->format('h:i A');
                        $status = "Present in Office (Biometric Punch-In at {$firstPunch})";
                    } else {
                        $absentCount++;
                        $status = "Absent / Not Checked In Yet Today";
                    }

                    $teamName = $emp->team ? $emp->team->name : 'General';
                    $designation = $emp->designation ?: 'Employee';
                    $tasks = $userTasksMap[$emp->id] ?? [];
                    $tasksText = empty($tasks) ? "No active tasks" : "Active Tasks: " . implode('; ', array_slice($tasks, 0, 3));

                    return "- {$emp->first_name} {$emp->last_name} (Code: {$emp->employee_code}, Team: {$teamName}, Role: {$designation}) | Status Today: {$status} | {$tasksText}";
                })->toArray();

                $totalEmp = count($employees);
                $summaryText = "Company Attendance Summary Today ({$todayStr}): Total Active: {$totalEmp}, Present: {$presentCount}, On Leave: {$leaveCount}, WFH: {$wfhCount}, Absent/Not Checked In: {$absentCount}.";
                $rosterSection = "\n6. ALL COMPANY EMPLOYEES: TODAY'S LIVE ATTENDANCE STATUS & ACTIVE TASKS:\n{$summaryText}\n" . implode("\n", $empRows) . "\n";

            } elseif ($isTeamLead) {
                // Team Lead: Direct teammates with today's live attendance & tasks
                $teammates = User::whereIn('team_id', $leadTeamIds)
                    ->where('id', '!=', $user->id)
                    ->where('status', 'Active')
                    ->with('team:id,name')
                    ->orderBy('first_name')
                    ->get(['id', 'first_name', 'last_name', 'employee_code', 'designation', 'team_id']);

                $attendancesToday = Attendance::where('date', $todayStr)
                    ->whereIn('user_id', $teammateIds)
                    ->get(['user_id', 'check_in_time', 'check_out_time', 'status'])
                    ->keyBy('user_id');

                $biometricInToday = BiometricEvent::whereIn('user_id', $teammateIds)
                    ->whereDate('local_punch_time', $todayStr)
                    ->where('direction', 'in')
                    ->orderBy('local_punch_time')
                    ->get(['user_id', 'local_punch_time'])
                    ->groupBy('user_id');

                $approvedLeavesToday = LeaveRequest::where('status', 'Approved')
                    ->whereIn('user_id', $teammateIds)
                    ->whereDate('start_date', '<=', $today)
                    ->whereDate('end_date', '>=', $today)
                    ->pluck('leave_type', 'user_id')
                    ->toArray();

                $empRows = $teammates->map(function ($emp) use (
                    $attendancesToday,
                    $biometricInToday,
                    $approvedLeavesToday,
                    $userTasksMap
                ) {
                    $att = $attendancesToday->get($emp->id);
                    $bioPunches = $biometricInToday->get($emp->id);
                    $leaveType = $approvedLeavesToday[$emp->id] ?? null;

                    if ($leaveType) {
                        $status = "On Leave ({$leaveType})";
                    } elseif ($att && $att->check_in_time) {
                        $checkInTime = Carbon::parse($att->check_in_time)->format('h:i A');
                        $status = $att->check_out_time 
                            ? "Present (Checked In at {$checkInTime}, Checked Out at " . Carbon::parse($att->check_out_time)->format('h:i A') . ")"
                            : "Present in Office (Checked In at {$checkInTime})";
                    } elseif ($bioPunches && $bioPunches->isNotEmpty()) {
                        $firstPunch = Carbon::parse($bioPunches->first()->local_punch_time)->format('h:i A');
                        $status = "Present in Office (Biometric In at {$firstPunch})";
                    } else {
                        $status = "Absent / Not Checked In Yet Today";
                    }

                    $tasks = $userTasksMap[$emp->id] ?? [];
                    $tasksText = empty($tasks) ? "No active tasks" : "Active Tasks: " . implode('; ', array_slice($tasks, 0, 3));

                    return "- {$emp->first_name} {$emp->last_name} (Code: {$emp->employee_code}, Role: {$emp->designation}) | Status Today: {$status} | {$tasksText}";
                })->toArray();

                $rosterSection = "\n6. YOUR DIRECT TEAM MEMBERS: TODAY'S ATTENDANCE & ACTIVE TASKS:\n" . (empty($empRows) ? "No active teammates registered." : implode("\n", $empRows)) . "\n";
            }
        } catch (\Exception $e) {
            $rosterSection = "\n6. Employee roster status unavailable.\n";
        }

        // 10. Projects & Team Members (Scoped by Role)
        try {
            $projectQuery = Project::query()->with([
                'team:id,name',
                'coordinator:id,first_name,last_name',
                'members:id,first_name,last_name',
            ]);

            if (!$isSuperAdmin && !$isHR) {
                if ($isTeamLead) {
                    $projectQuery->where(function ($q) use ($user, $leadTeamIds) {
                        if (!empty($leadTeamIds)) {
                            $q->whereIn('team_id', $leadTeamIds);
                        }
                        $q->orWhere('project_coordinator_id', $user->id)
                          ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
                    });
                } else {
                    // Regular Employee: ONLY projects where assigned as member or coordinator
                    $projectQuery->where(function ($q) use ($user) {
                        $q->where('project_coordinator_id', $user->id)
                          ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
                    });
                }
            }

            $projects = $projectQuery->take(50)->get()->map(function ($proj) {
                $coordinatorName = $proj->coordinator 
                    ? "{$proj->coordinator->first_name} {$proj->coordinator->last_name}" 
                    : "Not specified";
                $teamName = $proj->team ? $proj->team->name : 'General';
                $members = $proj->members->map(function ($m) {
                    $mRole = $m->pivot->project_role ?? 'Member';
                    return "{$m->first_name} {$m->last_name} ({$mRole})";
                })->toArray();
                $membersList = empty($members) ? "None assigned" : implode(', ', $members);
                $status = $proj->status ?? 'Active';
                return "- Project: \"{$proj->name}\" [Status: {$status}, Team: {$teamName}]\n  Coordinator: {$coordinatorName}\n  Members: {$membersList}";
            })->toArray();

            $projectsText = empty($projects)
                ? ($roleName === 'Employee' ? "You are not assigned to any active projects at this moment." : "No projects registered.")
                : implode("\n\n", $projects);
        } catch (\Exception $e) {
            $projectsText = "Project roster details unavailable.";
        }

        // 11. Pending Approvals (For Team Leads & Admins)
        $pendingApprovalsText = "";
        if ($isSuperAdmin || $isHR) {
            $pendingCount = LeaveRequest::where('status', 'Pending')->count();
            if ($pendingCount > 0) {
                $pendingApprovalsText = "Administrative Info: There are {$pendingCount} pending leave request(s) awaiting approval in the portal.";
            }
        } elseif ($isTeamLead) {
            $pendingList = LeaveRequest::where('status', 'Pending')
                ->whereIn('user_id', $teammateIds)
                ->with('user:id,first_name,last_name')
                ->take(10)
                ->get()
                ->map(fn($r) => "- " . ($r->user ? "{$r->user->first_name} {$r->user->last_name}" : "Team member") . ": {$r->leave_type} ({$r->start_date} to {$r->end_date})")
                ->toArray();
            if (!empty($pendingList)) {
                $pendingApprovalsText = "Pending approvals for your team members:\n" . implode("\n", $pendingList);
            }
        }

        // 12. Role-Specific Authorization Instructions
        if ($isSuperAdmin) {
            $roleInstruction = "
SUPER ADMIN UNRESTRICTED ACCESS (TOP PRIORITY - NO RESTRICTIONS):
- The current user is the verified SUPER ADMIN.
- Super Admins have absolute, 100% UNRESTRICTED CLEARANCE across all portal data, employees, attendances, tasks, and projects.
- You MUST answer ANY question the Super Admin asks about ANY employee without refusal, disclaimers, or privacy warnings.
- When the Super Admin asks:
  * 'what is [Name] doing now?' or 'what is [Name] working on?'
  * 'is [Name] present / in office today?' or 'what time did [Name] punch in?'
  * 'what are [Name]\'s tasks or projects?'
  * 'who is absent today?' or 'who is on leave today?' or 'how many employees are present?'
  * ANY question about any staff member:
  1. Look up the employee in Section 6 ('ALL COMPANY EMPLOYEES: TODAY\'S LIVE ATTENDANCE STATUS & ACTIVE TASKS') and Section 8 ('Active Tasks & Assignments'). Matching can be by first name, last name, or nickname (e.g., 'aswathi' matches 'Aswathi M Ashok').
  2. Answer directly and informatively:
     - Their live attendance status today (Present in office with check-in time / biometric punch-in time, Punched Out time, On Leave, Work From Home, or Absent / Not Checked In yet).
     - Their designation and department/team.
     - Their currently assigned active task(s) and project(s).
  3. NEVER decline to answer or state 'I cannot provide real-time information on what individual employees are doing' or 'My access is limited'. As Super Admin, the user owns the company workspace and is entitled to full real-time operational visibility.";
        } elseif ($isHR) {
            $roleInstruction = "
HR MANAGER AUTHORIZATION:
- The user is an HR Manager with company-wide administrative clearance.
- You have full managerial visibility across all employees, attendance records, leaves, and tasks in Section 6 and Section 8. Answer administrative queries thoroughly and directly without privacy refusals.";
        } elseif ($isTeamLead) {
            $roleInstruction = "
TEAM LEAD AUTHORIZATION:
- The user is a verified Team Lead.
- Team Leads ARE FULLY AUTHORIZED to see their teammates' tasks, projects, attendance, and leave status.
- Teammates in their team are listed in Section 6 ('YOUR DIRECT TEAM MEMBERS') and tasks in Section 8 ('Active Tasks & Assignments').
- When the Team Lead asks questions about their teammates (for example: 'what task is assigned to aswathy', 'is aswathy absent today', 'who is in my team', 'what is aswathy working on'):
  1. Look up the teammate by name (matching first name, last name, or nickname like 'aswathy' for 'Aswathi M Ashok').
  2. Answer directly with their tasks, task statuses, projects, and attendance status!
  3. DO NOT refuse to answer questions about their direct teammates.
- Only refuse if asked about employees completely outside their team/department, or private personal compensation/salaries.";
        } else {
            $roleInstruction = "
EMPLOYEE RESTRICTION:
- The user is a standard Employee. They can only view their own personal records, their own assigned tasks, and public company directory information.
- If an Employee asks for private data belonging to other employees (such as other employees' Hubstaff tracking, salaries, or peer tasks), politely decline: 'For privacy reasons, I can only provide your own personal records and general company announcements. Access to peer records and task supervision is restricted to Team Leads and Administrators.'";
        }

        // 13. Build Master System Prompt with Role Guidance
        $systemPrompt = "You are the Inter Smart Employee Portal AI Assistant. Your role is to answer questions about the portal, including leave applications, who is on leave today, team leads / departments, holidays, user profiles, team members, and assigned tasks and projects.

CURRENT USER INFORMATION:
- Name: {$user->first_name} {$user->last_name}
- Email: {$user->email}
- Employee Code: {$user->employee_code}
- Designation: {$user->designation}
- System Role: {$roleName}
- Current Date/Time: {$nowFormatted}

REAL-TIME DATABASE CONTEXT (Role-Filtered for: {$roleName}):
1. Your Personal Leave Balances:
   {$balanceText}

2. Your Personal Recent Leave Applications:
{$myLeavesText}

3. Today's Approved Leaves (Company-Wide):
   {$leavesTodayText}

4. Teams & Department Leads:
{$teamsText}

5. Upcoming Company Holidays:
{$holidaysText}
{$rosterSection}
7. Accessible Projects:
{$projectsText}

8. Active Tasks & Assignments:
{$tasksText}
" . ($pendingApprovalsText ? "\n9. Supervised Approvals:\n{$pendingApprovalsText}\n" : "") . "

PORTAL NAVIGATION LINKS:
- Apply for Leave: `/leaves/apply`
- View My Leaves: `/leaves`
- Leave Calendar: `/calendar`
- Attendance & Punch: `/attendance`
- View Projects: `/project-management/projects`
- View Tasks: `/project-management/tasks`
- View My Tasks: `/project-management/tasks/my`
- Profile Details: `/profile`
- Company Policies: `/project-management/addons/leave-policy`

CRITICAL PRIVACY & PERMISSION INSTRUCTIONS:
{$roleInstruction}

GENERAL INSTRUCTIONS:
1. READ-ONLY: You cannot perform CRUD actions (you cannot apply for leaves, change project/task statuses, or edit records). Guide the user to the relevant link above instead.
2. TONE & CLARITY: Keep answers professional, concise, friendly, and direct. Use clean markdown formatting (bullet points, bold text) for readability.
3. QUERY INTERPRETATION: If asked 'what is [Name] doing now' or 'what is [Name] working on', look up their live attendance status today (office check-in / punch-in time) and their active task assignments / projects from the real-time context and report it directly.
4. If the user asks about general company policies or something not in the context, give a general helpful answer or advise them to contact HR.";

        return $systemPrompt;
    }
}
