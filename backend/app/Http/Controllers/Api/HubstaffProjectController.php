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

        // Check using Spatie hasRole and fallback to attribute
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
}
