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
                'key' => 'attendance_team_view',
                'name' => 'Department Attendance Matrix Access',
                'description' => 'Allows assigned teams/leads to inspect the full attendance matrix and daily biometric punches for all departments.',
                'category' => 'Attendance',
                'icon' => 'CalendarCheck',
            ],
            [
                'key' => 'hubstaff_team_view',
                'name' => 'Hubstaff Productivity & Telemetry View',
                'description' => 'Allows assigned teams/leads to view Hubstaff activity rates, keyboard/mouse percentages, and tracked hours for team members.',
                'category' => 'Productivity',
                'icon' => 'Clock',
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

        $userTeamId = (int) ($user->team_id ?? 0);
        $userId = (int) $user->id;

        foreach ($activePermissions as $perm) {
            $permTeamId = (int) $perm->team_id;
            $teamLeadId = (int) ($perm->team->team_lead_id ?? 0);

            $isLeadOfTeam = ($userId === $teamLeadId) || ($user->hasRole('Team Lead') && $userTeamId === $permTeamId);
            $isMemberOfTeam = ($userTeamId === $permTeamId) || $isLeadOfTeam;

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
