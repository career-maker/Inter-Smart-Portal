<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomTeamPermission;
use App\Models\Team;
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

        return response()->json([
            'definitions' => $definitions,
            'teams' => $teams,
            'matrix' => $matrix,
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
        ]);

        $matrix = $request->input('matrix');

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
        ]);
    }
}
