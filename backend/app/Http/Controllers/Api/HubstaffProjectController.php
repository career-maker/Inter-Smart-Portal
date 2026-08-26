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
     * Restricted to users authorized to create projects (Super Admin & Team Lead).
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'Super Admin' && $user->role !== 'Team Lead') {
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

        if ($user->role !== 'Super Admin') {
            return response()->json(['message' => 'Only Super Admin can import all projects from Hubstaff.'], 403);
        }

        $result = $this->hubstaffService->importAllProjects($user);

        return response()->json($result);
    }
}
