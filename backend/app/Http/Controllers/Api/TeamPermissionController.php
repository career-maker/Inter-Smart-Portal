<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomTeamPermission;
use App\Models\CustomUserPermission;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\Request;

class TeamPermissionController extends Controller
{
    /**
     * Get permission definitions, teams, and active matrix assignments.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin') || strtolower($user->role ?? '') === 'super admin';

        if (!$isSuperAdmin) {
            return response()->json(['message' => 'Unauthorized. Super Admin access required.'], 403);
        }

        $definitions = CustomTeamPermission::getDefinitions();
        $teams = Team::select('id', 'name', 'code', 'team_lead_id')
            ->with('teamLead:id,first_name,last_name,email')
            ->orderBy('name')
            ->get();

        $assignments = CustomTeamPermission::where('is_active', true)->get();

        // Format into a clean map [permission_key => [team_id => scope]]
        $matrix = [];
        foreach ($definitions as $def) {
            $matrix[$def['key']] = [];
        }

        foreach ($assignments as $a) {
            $matrix[$a->permission_key][$a->team_id] = $a->scope;
        }

        $userMatrix = [];
        foreach ($definitions as $def) {
            $userMatrix[$def['key']] = [];
        }
        foreach (CustomUserPermission::all() as $row) {
            $userMatrix[$row->permission_key][] = (int) $row->user_id;
        }

        $users = User::where('status', 'Active')
            ->select('id', 'first_name', 'last_name', 'employee_code', 'designation')
            ->orderBy('first_name')
            ->get();

        return response()->json([
            'definitions' => $definitions,
            'teams' => $teams,
            'matrix' => $matrix,
            'users' => $users,
            'user_matrix' => $userMatrix,
        ]);
    }

    /**
     * Save/update permission matrix.
     */
    public function update(Request $request)
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin') || strtolower($user->role ?? '') === 'super admin';

        if (!$isSuperAdmin) {
            return response()->json(['message' => 'Unauthorized. Super Admin access required.'], 403);
        }

        $request->validate([
            'matrix' => 'required|array',
            'user_matrix' => 'sometimes|array',
            'user_matrix.*' => 'array',
            'user_matrix.*.*' => 'integer|exists:users,id',
        ]);

        $matrix = $request->input('matrix');

        // Individual member grants: replace the full set for each submitted permission key.
        $validKeys = array_column(CustomTeamPermission::getDefinitions(), 'key');
        foreach ($request->input('user_matrix', []) as $permissionKey => $userIds) {
            if (!in_array($permissionKey, $validKeys, true)) {
                continue;
            }
            $userIds = array_values(array_unique(array_map('intval', $userIds)));
            CustomUserPermission::where('permission_key', $permissionKey)
                ->whereNotIn('user_id', $userIds)
                ->delete();
            foreach ($userIds as $uid) {
                CustomUserPermission::firstOrCreate(['permission_key' => $permissionKey, 'user_id' => $uid]);
            }
        }

        // Update permissions transactionally
        foreach ($matrix as $permissionKey => $teamAssignments) {
            if (!is_array($teamAssignments)) {
                continue;
            }

            // Remove unselected teams for this permission
            $selectedTeamIds = array_keys(array_filter($teamAssignments, fn($scope) => in_array($scope, ['all_members', 'leads_only'])));
            
            CustomTeamPermission::where('permission_key', $permissionKey)
                ->whereNotIn('team_id', $selectedTeamIds)
                ->delete();

            // Insert / update selected teams
            foreach ($teamAssignments as $teamId => $scope) {
                if (!in_array($scope, ['all_members', 'leads_only'])) {
                    CustomTeamPermission::where('permission_key', $permissionKey)
                        ->where('team_id', (int) $teamId)
                        ->delete();
                    continue;
                }

                CustomTeamPermission::updateOrCreate(
                    [
                        'permission_key' => $permissionKey,
                        'team_id' => (int) $teamId,
                    ],
                    [
                        'scope' => $scope,
                        'is_active' => true,
                    ]
                );
            }
        }

        return response()->json([
            'message' => 'Team permissions updated successfully.',
        ]);
    }

    /**
     * Get the resolved permissions for the currently authenticated user.
     */
    public function getMyPermissions(Request $request)
    {
        $user = $request->user();
        $permissions = CustomTeamPermission::resolveUserPermissions($user);
        $isSuperAdmin = $user->hasRole('Super Admin') || strtolower($user->role ?? '') === 'super admin';

        return response()->json([
            'permissions' => $permissions,
            'is_super_admin' => $isSuperAdmin,
            'is_approver' => (bool) ($permissions['is_approver'] ?? false),
        ]);
    }
}
