<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PmAddon;
use App\Models\Team;
use Illuminate\Http\Request;

class AddonController extends Controller
{
    /**
     * List all Add-ons and their assigned teams.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin') || strtolower($user->role ?? '') === 'super admin';

        if (!$isSuperAdmin) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $addons = PmAddon::with(['teams:id,name,code'])->get();
        $allTeams = Team::select('id', 'name', 'code')->orderBy('name')->get();

        return response()->json([
            'addons' => $addons,
            'teams' => $allTeams,
        ]);
    }

    /**
     * Get active add-ons for the currently logged in user's team.
     */
    public function getMyAddons(Request $request)
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin') || strtolower($user->role ?? '') === 'super admin';

        // Super Admin has access to all active addons
        if ($isSuperAdmin) {
            $keys = PmAddon::where('is_active', true)->pluck('key')->toArray();
            return response()->json([
                'active_addons' => $keys,
                'is_super_admin' => true,
            ]);
        }

        // Collect all possible team IDs associated with this user
        $userTeamIds = [];
        if ($user->team_id) {
            $userTeamIds[] = (int) $user->team_id;
        }

        $ledTeamIds = Team::where('team_lead_id', $user->id)->pluck('id')->map(fn($id) => (int) $id)->toArray();
        $userTeamIds = array_unique(array_merge($userTeamIds, $ledTeamIds));

        // If user designation or department indicates QA / Quality / Testing, also include matching teams
        $deptStr = strtolower(($user->department ?? '') . ' ' . ($user->designation ?? ''));
        if (str_contains($deptStr, 'qa') || str_contains($deptStr, 'quality') || str_contains($deptStr, 'test')) {
            $qaTeamIds = Team::where('name', 'like', '%QA%')
                ->orWhere('name', 'like', '%Quality%')
                ->orWhere('name', 'like', '%Test%')
                ->pluck('id')
                ->map(fn($id) => (int) $id)
                ->toArray();
            $userTeamIds = array_unique(array_merge($userTeamIds, $qaTeamIds));
        }

        if (empty($userTeamIds)) {
            return response()->json([
                'active_addons' => [],
                'is_super_admin' => false,
            ]);
        }

        $keys = PmAddon::where('is_active', true)
            ->whereHas('teams', function ($q) use ($userTeamIds) {
                $q->whereIn('teams.id', $userTeamIds);
            })
            ->pluck('key')
            ->toArray();

        return response()->json([
            'active_addons' => $keys,
            'is_super_admin' => false,
        ]);
    }

    /**
     * Assign teams to an Add-on (Super Admin only).
     */
    public function assignTeams(Request $request, PmAddon $addon)
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin') || strtolower($user->role ?? '') === 'super admin';

        if (!$isSuperAdmin) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $request->validate([
            'team_ids' => ['present', 'array'],
            'team_ids.*' => ['integer', 'exists:teams,id'],
        ]);

        $addon->teams()->sync($request->input('team_ids', []));

        return response()->json([
            'message' => "Teams assigned to {$addon->name} successfully.",
            'addon' => $addon->load('teams:id,name,code'),
        ]);
    }

    /**
     * Toggle Add-on active state (Super Admin only).
     */
    public function toggleStatus(Request $request, PmAddon $addon)
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin') || strtolower($user->role ?? '') === 'super admin';

        if (!$isSuperAdmin) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $addon->is_active = !$addon->is_active;
        $addon->save();

        return response()->json([
            'message' => "Add-on {$addon->name} is now " . ($addon->is_active ? 'active' : 'inactive') . '.',
            'addon' => $addon->load('teams:id,name,code'),
        ]);
    }
}
