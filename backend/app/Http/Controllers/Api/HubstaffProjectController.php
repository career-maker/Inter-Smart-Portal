<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ProjectManagement\HubstaffService;
use Illuminate\Http\Request;

class HubstaffProjectController extends Controller
{
    public function __construct(
        protected HubstaffService $hubstaffService
    ) {}

    /**
     * List available Hubstaff projects for project linking during creation.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $isAuthorized = $user->hasRole('Super Admin')
            || $user->hasRole('Admin')
            || $user->hasRole('Team Lead')
            || $user->can('manage projects')
            || $user->can('create projects')
            || in_array(strtolower($user->role ?? ''), ['super admin', 'admin', 'team lead'], true);

        if (!$isAuthorized) {
            return response()->json(['message' => 'Unauthorized to view Hubstaff projects.'], 403);
        }

        $result = $this->hubstaffService->getProjects();

        return response()->json($result);
    }

    /**
     * Import all Hubstaff projects at once.
     * Prevents duplication of already imported projects.
     */
    public function importAll(Request $request)
    {
        $user = $request->user();

        $isAuthorized = $user->hasRole('Super Admin')
            || $user->hasRole('Admin')
            || $user->can('manage projects')
            || in_array(strtolower($user->role ?? ''), ['super admin', 'admin'], true);

        if (!$isAuthorized) {
            return response()->json(['message' => 'Only administrators can import projects from Hubstaff.'], 403);
        }

        $result = $this->hubstaffService->importAllProjects($user);

        return response()->json($result);
    }

    /**
     * Get Hubstaff members and their current HR Portal links.
     */
    public function getUsers(Request $request)
    {
        $user = $request->user();

        $isAuthorized = $user->hasRole('Super Admin')
            || $user->hasRole('Admin')
            || in_array(strtolower($user->role ?? ''), ['super admin', 'admin'], true);

        if (!$isAuthorized) {
            return response()->json(['message' => 'Unauthorized to view Hubstaff users.'], 403);
        }

        $result = $this->hubstaffService->getMembersWithUsers();

        return response()->json($result);
    }

    /**
     * Link or unlink a single Hubstaff user to an HR Portal employee.
     */
    public function linkUser(Request $request)
    {
        $user = $request->user();

        $isAuthorized = $user->hasRole('Super Admin')
            || $user->hasRole('Admin')
            || in_array(strtolower($user->role ?? ''), ['super admin', 'admin'], true);

        if (!$isAuthorized) {
            return response()->json(['message' => 'Unauthorized to link Hubstaff users.'], 403);
        }

        $request->validate([
            'hubstaff_user_id' => 'required|string',
            'user_id' => 'nullable|integer|exists:users,id',
        ]);

        $result = $this->hubstaffService->linkUser(
            $request->input('hubstaff_user_id'),
            $request->input('user_id'),
            $user
        );

        return response()->json($result);
    }

    /**
     * Batch sync Hubstaff user mappings.
     */
    public function syncUsers(Request $request)
    {
        $user = $request->user();

        $isAuthorized = $user->hasRole('Super Admin')
            || $user->hasRole('Admin')
            || in_array(strtolower($user->role ?? ''), ['super admin', 'admin'], true);

        if (!$isAuthorized) {
            return response()->json(['message' => 'Unauthorized to sync Hubstaff users.'], 403);
        }

        $request->validate([
            'mappings' => 'required|array',
            'mappings.*.hubstaff_user_id' => 'required|string',
            'mappings.*.user_id' => 'nullable|integer',
        ]);

        $result = $this->hubstaffService->syncUsers(
            $request->input('mappings'),
            $user
        );

        return response()->json($result);
    }

    /**
     * Get Hubstaff Analytics (Team & Date based work time & activity metrics).
     */
    public function analytics(Request $request)
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin') || in_array(strtolower($user->role ?? ''), ['super admin'], true);
        $isAdmin = $user->hasRole('Admin') || in_array(strtolower($user->role ?? ''), ['admin'], true);
        $isTeamLead = $user->hasRole('Team Lead')
            || in_array(strtolower($user->role ?? ''), ['team lead'], true)
            || \App\Models\Team::where('team_lead_id', $user->id)->exists();

        if (!$isSuperAdmin && !$isAdmin && !$isTeamLead) {
            return response()->json(['message' => 'Unauthorized to view Hubstaff analytics.'], 403);
        }

        // Date selection
        $dateMode = $request->input('date_mode', 'single');
        $singleDate = $request->input('date', now()->toDateString());
        $startDate = $dateMode === 'range' ? $request->input('start_date', now()->subDays(6)->toDateString()) : $singleDate;
        $endDate = $dateMode === 'range' ? $request->input('end_date', now()->toDateString()) : $singleDate;
        $forceRefresh = $request->boolean('refresh', false);

        // Resolve Team Scope & Security
        $allowedTeams = [];
        $selectedTeamId = null;
        $ledTeamIds = [];

        if ($isSuperAdmin || $isAdmin) {
            $allowedTeams = \App\Models\Team::select('id', 'name', 'code')->get();
            if ($request->filled('team_id') && $request->input('team_id') !== 'all') {
                $selectedTeamId = (int) $request->input('team_id');
            }
        } else {
            // Team Lead
            $ledTeamIds = \App\Models\Team::where('team_lead_id', $user->id)->pluck('id')->toArray();
            if ($user->team_id && !in_array($user->team_id, $ledTeamIds)) {
                $ledTeamIds[] = $user->team_id;
            }
            $ledTeamIds = array_values(array_unique(array_filter($ledTeamIds)));
            $allowedTeams = \App\Models\Team::whereIn('id', $ledTeamIds)->select('id', 'name', 'code')->get();

            if ($request->filled('team_id') && $request->input('team_id') !== 'all') {
                $reqTeamId = (int) $request->input('team_id');
                if (!in_array($reqTeamId, $ledTeamIds, true)) {
                    return response()->json(['message' => 'Unauthorized: Cannot access data for unauthorized team.'], 403);
                }
                $selectedTeamId = $reqTeamId;
            } else {
                // If Team Lead has only 1 team, set selectedTeamId to that team
                if (count($ledTeamIds) === 1) {
                    $selectedTeamId = $ledTeamIds[0];
                } else {
                    $selectedTeamId = null; // View all led teams
                }
            }
        }

        // Fetch Explicit User Links
        $userLinks = \App\Models\ProjectUserHubstaffLink::with([
            'user:id,first_name,last_name,email,employee_code,designation,team_id,profile_photo_path',
            'user.team:id,name'
        ])->get();

        $hubstaffUserMap = [];
        foreach ($userLinks as $link) {
            if ($link->user) {
                $hubstaffUserMap[(string) $link->hubstaff_user_id] = $link->user;
            }
        }

        // Auto-match any discovered members by email if not explicitly linked yet
        $discoveredMembers = $this->hubstaffService->getMembersWithUsers()['members'] ?? [];
        $unmappedEmails = [];
        $emailToHsIdMap = [];
        foreach ($discoveredMembers as $dm) {
            $hsId = (string) ($dm['hubstaff_user_id'] ?? '');
            $email = strtolower(trim($dm['email'] ?? ''));
            if (!empty($hsId) && !empty($email) && !isset($hubstaffUserMap[$hsId])) {
                $unmappedEmails[] = $email;
                $emailToHsIdMap[$email] = $hsId;
            }
        }

        if (!empty($unmappedEmails)) {
            $matchedUsers = \App\Models\User::whereIn('email', array_unique($unmappedEmails))
                ->with('team:id,name')
                ->select('id', 'first_name', 'last_name', 'email', 'employee_code', 'designation', 'team_id', 'profile_photo_path')
                ->get();

            foreach ($matchedUsers as $mu) {
                $email = strtolower(trim($mu->email));
                if (isset($emailToHsIdMap[$email])) {
                    $hsId = $emailToHsIdMap[$email];
                    $hubstaffUserMap[$hsId] = $mu;
                }
            }
        }

        // Fetch PM Projects map
        $pmProjects = \App\Models\Project::whereNotNull('hubstaff_project_id')->get()->keyBy('hubstaff_project_id');

        // Fetch Raw Hubstaff Activities
        $hubstaffRes = $this->hubstaffService->getDailyActivities($startDate, $endDate, $forceRefresh);
        $rawActivities = $hubstaffRes['activities'] ?? [];

        // Also fetch Hubstaff project names list
        $hsProjectsRes = $this->hubstaffService->getProjects();
        $hsProjectsNameMap = [];
        foreach (($hsProjectsRes['projects'] ?? []) as $hp) {
            $hsProjectsNameMap[(string) $hp['id']] = $hp['name'];
        }

        // Aggregate User Data
        $userMetrics = [];
        $projectMetrics = [];
        $dailyTrends = [];
        $totalTrackedSeconds = 0;
        $totalActivitySum = 0;
        $activityCount = 0;

        foreach ($rawActivities as $act) {
            $hsUid = (string) ($act['user_id'] ?? '');
            $hsPid = (string) ($act['project_id'] ?? '');
            $date = (string) ($act['date'] ?? '');
            if (empty($date) && !empty($act['starts_at'])) {
                try {
                    $date = \Carbon\Carbon::parse($act['starts_at'])->setTimezone(config('app.timezone', 'Asia/Kolkata'))->toDateString();
                } catch (\Throwable $e) {
                    $date = substr((string) $act['starts_at'], 0, 10);
                }
            }
            if (empty($date) && !empty($act['time_slot'])) {
                try {
                    $date = \Carbon\Carbon::parse($act['time_slot'])->setTimezone(config('app.timezone', 'Asia/Kolkata'))->toDateString();
                } catch (\Throwable $e) {
                    $date = substr((string) $act['time_slot'], 0, 10);
                }
            }
            if (empty($date)) {
                $date = $startDate;
            }
            $tracked = (int) ($act['tracked'] ?? $act['input_tracked'] ?? 0);
            
            // Hubstaff v2 returns either active seconds in 'overall', or percentage/fraction in 'activity'
            $rawOverall = (float) ($act['overall'] ?? 0);
            $rawActivity = (float) ($act['activity'] ?? 0);
            
            if ($rawActivity > 0) {
                if ($rawActivity > 100) {
                    $activity = $rawActivity / 100.0;
                } elseif ($rawActivity <= 1.0) {
                    $activity = $rawActivity * 100.0;
                } else {
                    $activity = $rawActivity;
                }
            } elseif ($tracked > 0 && $rawOverall > 0) {
                if ($rawOverall > $tracked) {
                    $activity = 100.0;
                } else {
                    $activity = ($rawOverall / $tracked) * 100.0;
                }
            } else {
                $activity = 0.0;
            }

            // Filter by team scope:
            if ($selectedTeamId) {
                if (!isset($hubstaffUserMap[$hsUid]) || ($hubstaffUserMap[$hsUid]->team_id ?? null) != $selectedTeamId) {
                    continue;
                }
            } elseif (!$isSuperAdmin && !$isAdmin && !empty($ledTeamIds)) {
                if (!isset($hubstaffUserMap[$hsUid]) || !in_array(($hubstaffUserMap[$hsUid]->team_id ?? null), $ledTeamIds)) {
                    continue;
                }
            }

            $userModel = $hubstaffUserMap[$hsUid] ?? null;
            $userKey = $userModel ? "user_{$userModel->id}" : "hs_{$hsUid}";
            $userName = $userModel ? trim("{$userModel->first_name} {$userModel->last_name}") : "Hubstaff User #{$hsUid}";
            $teamName = $userModel?->team?->name ?? "General";

            $pmProj = $pmProjects->get($hsPid);
            $projectName = $pmProj?->name ?? $hsProjectsNameMap[$hsPid] ?? "Hubstaff Project #{$hsPid}";

            $totalTrackedSeconds += $tracked;
            if ($tracked > 0) {
                $totalActivitySum += ($activity * $tracked);
                $activityCount += $tracked;
            }

            // User aggregation
            if (!isset($userMetrics[$userKey])) {
                $userMetrics[$userKey] = [
                    'user_id' => $userModel?->id,
                    'hubstaff_user_id' => $hsUid,
                    'name' => $userName,
                    'email' => $userModel?->email,
                    'employee_code' => $userModel?->employee_code,
                    'designation' => $userModel?->designation ?? 'Team Member',
                    'team_name' => $teamName,
                    'avatar' => $userModel?->profilePhotoUrl(),
                    'tracked_seconds' => 0,
                    'activity_weighted_sum' => 0,
                    'projects' => [],
                ];
            }
            $userMetrics[$userKey]['tracked_seconds'] += $tracked;
            $userMetrics[$userKey]['activity_weighted_sum'] += ($activity * $tracked);

            if (!isset($userMetrics[$userKey]['projects'][$hsPid])) {
                $userMetrics[$userKey]['projects'][$hsPid] = [
                    'project_id' => $pmProj?->id,
                    'hubstaff_project_id' => $hsPid,
                    'project_name' => $projectName,
                    'tracked_seconds' => 0,
                    'activity_weighted_sum' => 0,
                ];
            }
            $userMetrics[$userKey]['projects'][$hsPid]['tracked_seconds'] += $tracked;
            $userMetrics[$userKey]['projects'][$hsPid]['activity_weighted_sum'] += ($activity * $tracked);

            // Project aggregation
            if (!isset($projectMetrics[$hsPid])) {
                $projectMetrics[$hsPid] = [
                    'project_id' => $pmProj?->id,
                    'hubstaff_project_id' => $hsPid,
                    'name' => $projectName,
                    'status' => $pmProj?->status ?? 'Active',
                    'tracked_seconds' => 0,
                    'activity_weighted_sum' => 0,
                    'members' => [],
                ];
            }
            $projectMetrics[$hsPid]['tracked_seconds'] += $tracked;
            $projectMetrics[$hsPid]['activity_weighted_sum'] += ($activity * $tracked);

            if (!isset($projectMetrics[$hsPid]['members'][$userKey])) {
                $projectMetrics[$hsPid]['members'][$userKey] = [
                    'user_id' => $userModel?->id,
                    'name' => $userName,
                    'designation' => $userModel?->designation ?? 'Member',
                    'tracked_seconds' => 0,
                    'activity_weighted_sum' => 0,
                ];
            }
            $projectMetrics[$hsPid]['members'][$userKey]['tracked_seconds'] += $tracked;
            $projectMetrics[$hsPid]['members'][$userKey]['activity_weighted_sum'] += ($activity * $tracked);

            // Daily trend aggregation
            if (!isset($dailyTrends[$date])) {
                $dailyTrends[$date] = [
                    'date' => $date,
                    'tracked_seconds' => 0,
                    'activity_weighted_sum' => 0,
                ];
            }
            $dailyTrends[$date]['tracked_seconds'] += $tracked;
            $dailyTrends[$date]['activity_weighted_sum'] += ($activity * $tracked);
        }

        // Helper: format seconds to "Xh Ym"
        $fmtTime = function (int $sec) {
            $h = floor($sec / 3600);
            $m = floor(($sec % 3600) / 60);
            if ($h == 0 && $m == 0 && $sec > 0) return "1m";
            return "{$h}h " . str_pad($m, 2, '0', STR_PAD_LEFT) . "m";
        };

        // Format Users List
        $formattedUsers = [];
        foreach ($userMetrics as $u) {
            $trackedSec = $u['tracked_seconds'];
            $avgAct = $trackedSec > 0 ? (int) round($u['activity_weighted_sum'] / $trackedSec) : 0;
            $actLevel = $avgAct >= 70 ? 'high' : ($avgAct >= 50 ? 'moderate' : 'low');

            $projs = [];
            foreach ($u['projects'] as $p) {
                $pSec = $p['tracked_seconds'];
                $pAct = $pSec > 0 ? (int) round($p['activity_weighted_sum'] / $pSec) : 0;
                $projs[] = [
                    'project_id' => $p['project_id'],
                    'hubstaff_project_id' => $p['hubstaff_project_id'],
                    'project_name' => $p['project_name'],
                    'tracked_seconds' => $pSec,
                    'tracked_formatted' => $fmtTime($pSec),
                    'activity_percentage' => $pAct,
                ];
            }
            usort($projs, fn($a, $b) => $b['tracked_seconds'] <=> $a['tracked_seconds']);

            $formattedUsers[] = [
                'user_id' => $u['user_id'],
                'hubstaff_user_id' => $u['hubstaff_user_id'],
                'name' => $u['name'],
                'email' => $u['email'],
                'employee_code' => $u['employee_code'],
                'designation' => $u['designation'],
                'team_name' => $u['team_name'],
                'avatar' => $u['avatar'],
                'tracked_seconds' => $trackedSec,
                'tracked_formatted' => $fmtTime($trackedSec),
                'activity_percentage' => $avgAct,
                'activity_level' => $actLevel,
                'projects_count' => count($projs),
                'projects' => $projs,
            ];
        }
        usort($formattedUsers, fn($a, $b) => $b['tracked_seconds'] <=> $a['tracked_seconds']);

        // Format Projects List
        $formattedProjects = [];
        foreach ($projectMetrics as $p) {
            $trackedSec = $p['tracked_seconds'];
            $avgAct = $trackedSec > 0 ? (int) round($p['activity_weighted_sum'] / $trackedSec) : 0;

            $membersList = [];
            foreach ($p['members'] as $m) {
                $mSec = $m['tracked_seconds'];
                $mAct = $mSec > 0 ? (int) round($m['activity_weighted_sum'] / $mSec) : 0;
                $membersList[] = [
                    'user_id' => $m['user_id'],
                    'name' => $m['name'],
                    'designation' => $m['designation'],
                    'tracked_seconds' => $mSec,
                    'tracked_formatted' => $fmtTime($mSec),
                    'activity_percentage' => $mAct,
                ];
            }
            usort($membersList, fn($a, $b) => $b['tracked_seconds'] <=> $a['tracked_seconds']);

            $formattedProjects[] = [
                'project_id' => $p['project_id'],
                'hubstaff_project_id' => $p['hubstaff_project_id'],
                'name' => $p['name'],
                'status' => $p['status'],
                'tracked_seconds' => $trackedSec,
                'tracked_formatted' => $fmtTime($trackedSec),
                'activity_percentage' => $avgAct,
                'members_count' => count($membersList),
                'members' => $membersList,
            ];
        }
        usort($formattedProjects, fn($a, $b) => $b['tracked_seconds'] <=> $a['tracked_seconds']);

        // Format Daily Trends
        ksort($dailyTrends);
        $formattedTrends = [];
        foreach ($dailyTrends as $d) {
            $dSec = $d['tracked_seconds'];
            $dAct = $dSec > 0 ? (int) round($d['activity_weighted_sum'] / $dSec) : 0;
            $formattedTrends[] = [
                'date' => $d['date'],
                'date_formatted' => \Carbon\Carbon::parse($d['date'])->format('d M'),
                'tracked_seconds' => $dSec,
                'tracked_hours' => round($dSec / 3600, 1),
                'tracked_formatted' => $fmtTime($dSec),
                'activity_percentage' => $dAct,
            ];
        }

        // Summary Calculations
        $avgOverallActivity = $activityCount > 0 ? (int) round($totalActivitySum / $activityCount) : 0;
        $activeUsersCount = count($formattedUsers);
        $activeProjectsCount = count($formattedProjects);
        $avgTimePerUserSec = $activeUsersCount > 0 ? (int) round($totalTrackedSeconds / $activeUsersCount) : 0;

        return response()->json([
            'date_mode' => $dateMode,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'selected_team_id' => $selectedTeamId,
            'available_teams' => $allowedTeams,
            'summary' => [
                'total_tracked_seconds' => $totalTrackedSeconds,
                'total_tracked_formatted' => $fmtTime($totalTrackedSeconds),
                'avg_activity_percentage' => $avgOverallActivity,
                'active_users_count' => $activeUsersCount,
                'active_projects_count' => $activeProjectsCount,
                'avg_time_per_user_formatted' => $fmtTime($avgTimePerUserSec),
            ],
            'users' => $formattedUsers,
            'projects' => $formattedProjects,
            'trends' => $formattedTrends,
            'last_refreshed_at' => now()->toIso8601String(),
        ]);
    }
}
