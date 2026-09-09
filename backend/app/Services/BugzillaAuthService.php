<?php

namespace App\Services;

use App\Models\CustomTeamPermission;
use App\Models\PmAddon;
use App\Models\Project;
use App\Models\Team;
use App\Models\User;

class BugzillaAuthService
{
    /**
     * Determine if a user has the Bugzilla add-on enabled for their assigned team(s).
     */
    public static function isAddonEnabledForUser(?User $user): bool
    {
        if (!$user) {
            return false;
        }

        if (self::isSuperAdmin($user)) {
            return true;
        }

        $userTeamIds = self::resolveUserTeamIds($user);
        if (empty($userTeamIds)) {
            return false;
        }

        return PmAddon::where('key', 'bugzilla')
            ->where('is_active', true)
            ->whereHas('teams', function ($q) use ($userTeamIds) {
                $q->whereIn('teams.id', $userTeamIds);
            })
            ->exists();
    }

    /**
     * Check if user is Super Admin.
     */
    public static function isSuperAdmin(?User $user): bool
    {
        if (!$user) {
            return false;
        }
        return $user->hasRole('Super Admin') || strtolower($user->role ?? '') === 'super admin';
    }

    /**
     * Check if user can VIEW Bugzilla (Viewer, Reporter, or Developer).
     */
    public static function canView(?User $user): bool
    {
        if (!self::isAddonEnabledForUser($user)) {
            return false;
        }

        if (self::isSuperAdmin($user)) {
            return true;
        }

        return CustomTeamPermission::userHasPermission($user, 'bugzilla_viewer')
            || CustomTeamPermission::userHasPermission($user, 'bugzilla_reporter')
            || CustomTeamPermission::userHasPermission($user, 'bugzilla_developer');
    }

    /**
     * Check if user can REPORT bugs (Reporter capability).
     */
    public static function canReport(?User $user): bool
    {
        if (!self::isAddonEnabledForUser($user)) {
            return false;
        }

        if (self::isSuperAdmin($user)) {
            return true;
        }

        return CustomTeamPermission::userHasPermission($user, 'bugzilla_reporter');
    }

    /**
     * Check if user has DEVELOPER capability.
     */
    public static function canDevelop(?User $user): bool
    {
        if (!self::isAddonEnabledForUser($user)) {
            return false;
        }

        if (self::isSuperAdmin($user)) {
            return true;
        }

        return CustomTeamPermission::userHasPermission($user, 'bugzilla_developer');
    }

    /**
     * Check if user can manage Bugzilla projects & components (Super Admin only).
     */
    public static function canManageSettings(?User $user): bool
    {
        return self::isSuperAdmin($user);
    }

    /**
     * Verify user is authorized to interact with a specific portal project.
     */
    public static function canAccessProject(?User $user, int $portalProjectId): bool
    {
        if (!self::canView($user)) {
            return false;
        }

        if (self::isSuperAdmin($user)) {
            return true;
        }

        // Check if user has cross-team view permission
        if (CustomTeamPermission::userHasPermission($user, 'task_cross_team_view')) {
            return true;
        }

        $project = Project::find($portalProjectId);
        if (!$project) {
            return false;
        }

        $userTeamIds = self::resolveUserTeamIds($user);
        if ($project->team_id && in_array((int) $project->team_id, $userTeamIds, true)) {
            return true;
        }

        // Project coordinator check
        if ((int) $project->project_coordinator_id === (int) $user->id) {
            return true;
        }

        // Project member check
        if ($project->members()->where('user_id', $user->id)->exists()) {
            return true;
        }

        return false;
    }

    /**
     * Resolve all team IDs linked to a user.
     */
    public static function resolveUserTeamIds(User $user): array
    {
        $ids = [];
        if (!empty($user->team_id)) {
            $ids[] = (int) $user->team_id;
        }
        if (!empty($user->department_id)) {
            $ids[] = (int) $user->department_id;
        }

        $ledTeamIds = Team::where('team_lead_id', $user->id)->pluck('id')->map(fn($id) => (int) $id)->toArray();
        $ids = array_merge($ids, $ledTeamIds);

        $deptStr = strtolower(trim(($user->department ?? '') . ' ' . ($user->designation ?? '')));
        if ($deptStr !== '') {
            $allTeams = Team::select('id', 'name', 'code')->get();
            foreach ($allTeams as $t) {
                $tName = strtolower(trim($t->name));
                $tCode = strtolower(trim($t->code ?? ''));
                if ($tName && (str_contains($deptStr, $tName) || str_contains($tName, $deptStr))) {
                    $ids[] = (int) $t->id;
                } elseif ($tCode && str_contains($deptStr, $tCode)) {
                    $ids[] = (int) $t->id;
                }
            }
        }

        return array_values(array_unique(array_filter($ids)));
    }

    /**
     * Resolve full capability payload for user.
     */
    public static function getCapabilitiesPayload(?User $user): array
    {
        if (!$user) {
            return [
                'has_access' => false,
                'can_view' => false,
                'can_report' => false,
                'can_develop' => false,
                'can_manage' => false,
                'is_super_admin' => false,
                'addon_enabled' => false,
            ];
        }

        $addonEnabled = self::isAddonEnabledForUser($user);
        $isSuperAdmin = self::isSuperAdmin($user);
        $canView = self::canView($user);
        $canReport = self::canReport($user);
        $canDevelop = self::canDevelop($user);
        $canManage = self::canManageSettings($user);

        return [
            'has_access' => $canView,
            'can_view' => $canView,
            'can_report' => $canReport,
            'can_develop' => $canDevelop,
            'can_manage' => $canManage,
            'is_super_admin' => $isSuperAdmin,
            'addon_enabled' => $addonEnabled,
        ];
    }
}
