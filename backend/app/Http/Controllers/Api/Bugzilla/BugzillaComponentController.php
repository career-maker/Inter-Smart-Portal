<?php

namespace App\Http\Controllers\Api\Bugzilla;

use App\Http\Controllers\Controller;
use App\Models\BugzillaComponent;
use App\Models\BugzillaProject;
use App\Services\BugzillaAuthService;
use Illuminate\Http\Request;

class BugzillaComponentController extends Controller
{
    /**
     * List components for a project.
    /**
     * Helper to resolve or auto-create Bugzilla project row from ID or Portal Project ID.
     */
    protected function resolveProject($projectId, $user): ?BugzillaProject
    {
        $project = BugzillaProject::where('id', $projectId)
            ->orWhere('portal_project_id', $projectId)
            ->first();

        if (!$project) {
            $portalProject = \App\Models\Project::find($projectId);
            if ($portalProject) {
                $project = BugzillaProject::firstOrCreate(
                    ['portal_project_id' => $portalProject->id],
                    [
                        'name' => $portalProject->name,
                        'description' => $portalProject->description,
                        'status' => 'active',
                        'created_by' => $user->id,
                    ]
                );
                if ($project->components()->count() === 0) {
                    $project->components()->create(['name' => 'General', 'status' => 'active']);
                }
            }
        }

        return $project;
    }

    /**
     * List components for a project.
     */
    public function index(Request $request, $projectId)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canView($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $project = $this->resolveProject($projectId, $user);
        if (!$project) {
            return response()->json(['message' => 'Project not found.'], 404);
        }

        if (!BugzillaAuthService::canAccessProject($user, $project->portal_project_id)) {
            return response()->json(['message' => 'Unauthorized project access.'], 403);
        }

        $components = BugzillaComponent::where('bugzilla_project_id', $project->id)
            ->with('defaultAssignee:id,first_name,last_name,email')
            ->withCount('bugs')
            ->orderBy('name')
            ->get();

        return response()->json([
            'components' => $components,
        ]);
    }

    /**
     * Create a new component.
     */
    public function store(Request $request, $projectId)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canDevelop($user) && !BugzillaAuthService::canManageSettings($user)) {
            return response()->json(['message' => 'Developer or Admin permission required.'], 403);
        }

        $project = $this->resolveProject($projectId, $user);
        if (!$project) {
            return response()->json(['message' => 'Project not found.'], 404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'default_assignee_id' => 'nullable|integer|exists:users,id',
            'status' => 'sometimes|in:active,inactive',
        ]);

        $exists = BugzillaComponent::where('bugzilla_project_id', $project->id)
            ->where('name', trim($validated['name']))
            ->exists();

        if ($exists) {
            return response()->json(['message' => "Component '{$validated['name']}' already exists in this project."], 422);
        }

        $component = BugzillaComponent::create([
            'bugzilla_project_id' => $project->id,
            'name' => trim($validated['name']),
            'description' => $validated['description'] ?? null,
            'default_assignee_id' => $validated['default_assignee_id'] ?? null,
            'status' => $validated['status'] ?? 'active',
        ]);

        return response()->json([
            'message' => 'Component created successfully.',
            'component' => $component->load('defaultAssignee'),
        ], 201);
    }

    /**
     * Update an existing component.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canDevelop($user) && !BugzillaAuthService::canManageSettings($user)) {
            return response()->json(['message' => 'Developer or Admin permission required.'], 403);
        }

        $component = BugzillaComponent::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:150',
            'description' => 'nullable|string',
            'default_assignee_id' => 'nullable|integer|exists:users,id',
            'status' => 'sometimes|in:active,inactive',
        ]);

        if (isset($validated['name'])) {
            $duplicate = BugzillaComponent::where('bugzilla_project_id', $component->bugzilla_project_id)
                ->where('name', trim($validated['name']))
                ->where('id', '!=', $id)
                ->exists();

            if ($duplicate) {
                return response()->json(['message' => "Component '{$validated['name']}' already exists."], 422);
            }
            $validated['name'] = trim($validated['name']);
        }

        $component->update($validated);

        return response()->json([
            'message' => 'Component updated successfully.',
            'component' => $component->fresh('defaultAssignee'),
        ]);
    }

    /**
     * Delete a component if not used by existing bugs.
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canManageSettings($user)) {
            return response()->json(['message' => 'Super Admin permission required to delete components.'], 403);
        }

        $component = BugzillaComponent::findOrFail($id);
        $bugsCount = $component->bugs()->count();

        if ($bugsCount > 0) {
            return response()->json([
                'message' => "Cannot delete component: {$bugsCount} bug(s) are currently categorized under it. Deactivate it instead.",
            ], 422);
        }

        $component->delete();

        return response()->json([
            'message' => 'Component deleted successfully.',
        ]);
    }
}
