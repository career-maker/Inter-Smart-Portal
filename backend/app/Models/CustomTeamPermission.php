<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomTeamPermission extends Model
{
    protected $guarded = [];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * Standard definitions for all custom permissions in the system.
     */
    public static function getDefinitions(): array
    {
        return [
            [
                'key' => 'task_cross_team_view',
                'name' => 'Cross-Team Task Visibility & Switcher',
                'description' => 'Enables the Team Switcher dropdown on the All Tasks page, allowing assigned teams/leads to view other teams’ task tables and backlogs.',
                'category' => 'Tasks & Projects',
                'icon' => 'Layers',
            ],
            [
                'key' => 'task_cross_team_assign',
                'name' => 'Cross-Team Task Creation & Assignment',
                'description' => 'Allows assigned teams/leads to create and assign tasks to members of other departments/teams.',
                'category' => 'Tasks & Projects',
                'icon' => 'UserPlus',
            ],
            [
                'key' => 'bug_reports_cross_team',
                'name' => 'Global QA Bug Reports Access',
                'description' => 'Allows assigned teams/leads to inspect QA bug metrics, HTML/functional bug counts, and bug tracker links across all delivery teams.',
                'category' => 'Quality Assurance',
                'icon' => 'Bug',
            ],
            [
                'key' => 'hubstaff_team_view',
                'name' => 'Hubstaff Productivity & Telemetry View',
                'description' => 'Allows assigned teams/leads to view Hubstaff activity rates, keyboard/mouse percentages, and tracked hours for team members.',
                'category' => 'Productivity',
                'icon' => 'Clock',
            ],
            [
                'key' => 'bugzilla_viewer',
                'name' => 'Bugzilla - Viewer',
                'description' => 'Allows viewing Bugzilla projects, components, bugs, comments, attachments, history, and dependencies.',
                'category' => 'Bugzilla Defect Management',
                'icon' => 'Eye',
            ],
            [
                'key' => 'bugzilla_reporter',
                'name' => 'Bugzilla - Reporter',
                'description' => 'Allows filing new bugs, editing reporter-owned reproduction details, and uploading bug attachments.',
                'category' => 'Bugzilla Defect Management',
                'icon' => 'FilePlus',
            ],
            [
                'key' => 'bugzilla_developer',
                'name' => 'Bugzilla - Developer',
                'description' => 'Allows updating bug statuses, assigning defects, changing severities/priorities, adding comments, managing labels and resolving bugs.',
                'category' => 'Bugzilla Defect Management',
                'icon' => 'Code',
            ],
        ];
    }

    /**
     * Helper to check if a given user has a custom permission.
     */
    public static function userHasPermission($user, string $permissionKey): bool
    {
        if (!$user) {
            return false;
        }

        // Super Admin always has full access
        if ($user->hasRole('Super Admin') || strtolower($user->role ?? '') === 'super admin') {
            return true;
        }

        $activePermissions = static::where('permission_key', $permissionKey)
            ->where('is_active', true)
            ->with('team')
            ->get();

        if ($activePermissions->isEmpty()) {
            return false;
        }

        $userId = (int) $user->id;
        $userTeamIds = [];
        if (!empty($user->team_id)) {
            $userTeamIds[] = (int) $user->team_id;
        }
        if (!empty($user->department_id)) {
            $userTeamIds[] = (int) $user->department_id;
        }

        // Teams this user leads
        $ledTeamIds = Team::where('team_lead_id', $userId)->pluck('id')->map(fn($id) => (int) $id)->toArray();
        $userTeamIds = array_merge($userTeamIds, $ledTeamIds);

        // Department & designation string matching (e.g. "QA", "Design", "HTML", "PHP", "WordPress")
        $deptStr = strtolower(trim(($user->department ?? '') . ' ' . ($user->designation ?? '')));
        if ($deptStr !== '') {
            $allTeams = Team::select('id', 'name', 'code')->get();
            foreach ($allTeams as $t) {
                $tName = strtolower(trim($t->name));
                $tCode = strtolower(trim($t->code ?? ''));
                if ($tName && (str_contains($deptStr, $tName) || str_contains($tName, $deptStr))) {
                    $userTeamIds[] = (int) $t->id;
                } elseif ($tCode && str_contains($deptStr, $tCode)) {
                    $userTeamIds[] = (int) $t->id;
                }
            }
        }

        $userTeamIds = array_values(array_unique(array_filter($userTeamIds)));

        foreach ($activePermissions as $perm) {
            $permTeamId = (int) $perm->team_id;
            $teamLeadId = (int) ($perm->team->team_lead_id ?? 0);

            $isLeadOfTeam = ($userId === $teamLeadId) || ($user->hasRole('Team Lead') && in_array($permTeamId, $userTeamIds, true));
            $isMemberOfTeam = in_array($permTeamId, $userTeamIds, true) || $isLeadOfTeam;

            if ($perm->scope === 'all_members' && $isMemberOfTeam) {
                return true;
            }

            if ($perm->scope === 'leads_only' && $isLeadOfTeam) {
                return true;
            }
        }

        return false;
    }

    /**
     * Resolve all granted permissions for a user into a key-value dictionary.
     */
    public static function resolveUserPermissions($user): array
    {
        $definitions = static::getDefinitions();
        $results = [];

        foreach ($definitions as $def) {
            $results[$def['key']] = static::userHasPermission($user, $def['key']);
        }

        return $results;
    }
}
