<?php

namespace App\Http\Controllers\Api\Bugzilla;

use App\Http\Controllers\Controller;
use App\Models\BugzillaProject;
use App\Models\Project;
use App\Services\BugzillaAuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BugzillaProjectController extends Controller
{
    /**
     * List all Bugzilla projects with portal project info and bug counters.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canView($user)) {
            return response()->json(['message' => 'Bugzilla module is not enabled for your team or account.'], 403);
        }

        $query = BugzillaProject::with([
            'portalProject:id,name,status,category,team_id,project_coordinator_id',
            'portalProject.team:id,name,code',
            'portalProject.coordinator:id,first_name,last_name',
            'defaultAssignee:id,first_name,last_name,email',
        ])
        ->withCount([
            'components',
            'bugs',
            'bugs as open_bugs_count' => function ($q) {
                $q->whereNotIn('status', ['RESOLVED', 'CLOSED']);
            },
            'bugs as critical_bugs_count' => function ($q) {
                $q->whereIn('severity', ['BLOCKER', 'CRITICAL'])
                  ->whereNotIn('status', ['RESOLVED', 'CLOSED']);
            },
        ]);

        // Filter projects by team if not super admin and no cross-team view
        if (!BugzillaAuthService::isSuperAdmin($user) && !\App\Models\CustomTeamPermission::userHasPermission($user, 'task_cross_team_view')) {
            $userTeamIds = BugzillaAuthService::resolveUserTeamIds($user);
            $query->whereHas('portalProject', function ($q) use ($userTeamIds) {
                $q->whereIn('team_id', $userTeamIds);
            });
        }

        $projects = $query->orderBy('name')->get();

        return response()->json([
            'projects' => $projects,
            'capabilities' => BugzillaAuthService::getCapabilitiesPayload($user),
        ]);
    }

    /**
     * Get unmapped portal projects (for manual project mapping dialog).
     */
    public function unmappedPortalProjects(Request $request)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canManageSettings($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $mappedIds = BugzillaProject::pluck('portal_project_id')->toArray();

        $unmapped = Project::whereNotIn('id', $mappedIds)
            ->select('id', 'name', 'status', 'category', 'team_id')
            ->with('team:id,name,code')
            ->orderBy('name')
            ->get();

        return response()->json([
            'unmapped_projects' => $unmapped,
        ]);
    }

    /**
     * Manually map a portal project to Bugzilla.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canManageSettings($user)) {
            return response()->json(['message' => 'Unauthorized. Super Admin access required.'], 403);
        }

        $validated = $request->validate([
            'portal_project_id' => 'required|integer|exists:pm_projects,id|unique:bugzilla_projects,portal_project_id',
            'name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'default_assignee_id' => 'nullable|integer|exists:users,id',
        ]);

        $portalProject = Project::findOrFail($validated['portal_project_id']);

        $name = !empty($validated['name']) ? trim($validated['name']) : $portalProject->name;

        $project = BugzillaProject::create([
            'portal_project_id' => $portalProject->id,
            'name' => $name,
            'description' => $validated['description'] ?? $portalProject->description,
            'status' => 'active',
            'default_assignee_id' => $validated['default_assignee_id'] ?? null,
            'created_by' => $user->id,
        ]);

        // Default initial components if none exist
        $defaultComponents = ['UI / Frontend', 'Backend / API', 'Database', 'General'];
        foreach ($defaultComponents as $cName) {
            $project->components()->create([
                'name' => $cName,
                'status' => 'active',
            ]);
        }

        return response()->json([
            'message' => "Bugzilla project '{$project->name}' created successfully.",
            'project' => $project->load('components', 'portalProject'),
        ], 201);
    }

    /**
     * Auto Create Bugzilla Project mappings for all existing unmapped portal projects.
     * Idempotent: skips already mapped projects, never fails whole batch.
     */
    public function autoCreate(Request $request)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canManageSettings($user)) {
            return response()->json(['message' => 'Unauthorized. Super Admin access required.'], 403);
        }

        $allPortalProjects = Project::all();
        $createdCount = 0;
        $skippedCount = 0;
        $errors = [];

        foreach ($allPortalProjects as $p) {
            try {
                $exists = BugzillaProject::where('portal_project_id', $p->id)->exists();
                if ($exists) {
                    $skippedCount++;
                    continue;
                }

                $bzProject = BugzillaProject::create([
                    'portal_project_id' => $p->id,
                    'name' => $p->name,
                    'description' => $p->description,
                    'status' => 'active',
                    'created_by' => $user->id,
                ]);

                // Create default components
                $bzProject->components()->createMany([
                    ['name' => 'UI / Frontend', 'status' => 'active'],
                    ['name' => 'Backend / API', 'status' => 'active'],
                    ['name' => 'General', 'status' => 'active'],
                ]);

                $createdCount++;
            } catch (\Throwable $e) {
                $errors[] = "Failed project {$p->name}: " . $e->getMessage();
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Auto-creation complete. Created: {$createdCount}, Skipped (already mapped): {$skippedCount}, Failures: " . count($errors),
            'created' => $createdCount,
            'skipped' => $skippedCount,
            'failed' => count($errors),
            'errors' => $errors,
            'data' => [
                'created' => $createdCount,
                'skipped' => $skippedCount,
                'failed' => count($errors),
                'errors' => $errors,
            ],
        ]);
    }

    /**
     * Show Bugzilla project with components and metadata.
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canView($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $project = BugzillaProject::with([
            'portalProject',
            'portalProject.team',
            'portalProject.coordinator',
            'portalProject.members.user:id,first_name,last_name,email,designation',
            'components' => function ($q) {
                $q->orderBy('name');
            },
            'components.defaultAssignee:id,first_name,last_name,email',
            'defaultAssignee:id,first_name,last_name,email',
        ])
        ->withCount(['bugs', 'components'])
        ->findOrFail($id);

        if (!BugzillaAuthService::canAccessProject($user, $project->portal_project_id)) {
            return response()->json(['message' => 'You do not have permission to view this project.'], 403);
        }

        return response()->json([
            'project' => $project,
        ]);
    }

    /**
     * Update Bugzilla project settings.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canManageSettings($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $project = BugzillaProject::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'sometimes|in:active,inactive',
            'default_assignee_id' => 'nullable|integer|exists:users,id',
        ]);

        $project->update($validated);

        return response()->json([
            'message' => 'Bugzilla project updated successfully.',
            'project' => $project->fresh(['components', 'defaultAssignee']),
        ]);
    }
}
