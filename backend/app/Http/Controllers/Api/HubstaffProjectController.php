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
}
