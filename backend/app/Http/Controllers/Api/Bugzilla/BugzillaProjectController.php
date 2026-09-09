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
            return response()->json(['message' => 'bugSmart module is not enabled for your team or account.'], 403);
        }

        $query = Project::query()
            ->with([
                'team:id,name,code',
                'coordinator:id,first_name,last_name',
                'bugzillaProject.defaultAssignee:id,first_name,last_name,email',
                'bugzillaProject.components',
            ])
            ->withCount([
                'bugzillaBugs as bugs_count',
                'bugzillaBugs as open_bugs_count' => function ($q) {
                    $q->whereNotIn('status', ['RESOLVED', 'CLOSED']);
                },
                'bugzillaBugs as critical_bugs_count' => function ($q) {
                    $q->whereIn('severity', ['BLOCKER', 'CRITICAL'])
                      ->whereNotIn('status', ['RESOLVED', 'CLOSED']);
                },
            ]);

        // All users with BugSmart view capability can see all project names
        if ($request->boolean('my')) {
            $query->where(function ($q) use ($user) {
                $q->where('project_coordinator_id', $user->id)
                  ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id))
                  ->orWhereHas('tasks', function ($t) use ($user) {
                      $t->whereHas('assignees', fn ($a) => $a->where('users.id', $user->id));
                  });
            });
        }

        if ($request->filled('status') && $request->query('status') !== 'all') {
            $query->where('status', $request->query('status'));
        }

        $portalProjects = $query->orderBy('name')->get();

        $projects = $portalProjects->map(function ($p) {
            $bz = $p->bugzillaProject;
            return [
                'id' => $bz ? $bz->id : $p->id,
                'portal_project_id' => $p->id,
                'name' => $p->name,
                'description' => $p->description,
                'status' => $p->status,
                'category' => $p->category,
                'team' => $p->team,
                'coordinator' => $p->coordinator,
                'portal_project' => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'status' => $p->status,
                    'category' => $p->category,
                    'team' => $p->team,
                    'coordinator' => $p->coordinator,
                ],
                'default_assignee' => $bz?->defaultAssignee,
                'components' => $bz ? $bz->components : [],
                'components_count' => $bz ? $bz->components->count() : 0,
                'bugs_count' => (int) ($p->bugs_count ?? 0),
                'open_bugs_count' => (int) ($p->open_bugs_count ?? 0),
                'critical_bugs_count' => (int) ($p->critical_bugs_count ?? 0),
                'created_at' => $p->created_at,
            ];
        });

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
     * Show bugSmart project with components and metadata.
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canView($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $project = BugzillaProject::where('id', $id)
            ->orWhere('portal_project_id', $id)
            ->first();

        if (!$project) {
            $portalProject = Project::find($id);
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
            } else {
                return response()->json(['message' => 'Project not found.'], 404);
            }
        }

        $project->load([
            'portalProject',
            'portalProject.team',
            'portalProject.coordinator',
            'portalProject.members.user:id,first_name,last_name,email,designation',
            'components' => function ($q) {
                $q->orderBy('name');
            },
            'components.defaultAssignee:id,first_name,last_name,email',
            'defaultAssignee:id,first_name,last_name,email',
        ]);
        $project->loadCount(['bugs', 'components']);

        if (!BugzillaAuthService::canAccessProject($user, $project->portal_project_id)) {
            return response()->json(['message' => 'You do not have permission to view this project.'], 403);
        }

        return response()->json([
            'project' => $project,
        ]);
    }

    /**
     * Update bugSmart project settings.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canManageSettings($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $project = BugzillaProject::where('id', $id)
            ->orWhere('portal_project_id', $id)
            ->first();

        if (!$project) {
            $portalProject = Project::findOrFail($id);
            $project = BugzillaProject::firstOrCreate(
                ['portal_project_id' => $portalProject->id],
                [
                    'name' => $portalProject->name,
                    'description' => $portalProject->description,
                    'status' => 'active',
                    'created_by' => $user->id,
                ]
            );
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'sometimes|in:active,inactive',
            'default_assignee_id' => 'nullable|integer|exists:users,id',
        ]);

        $project->update($validated);

        return response()->json([
            'message' => 'bugSmart project updated successfully.',
            'project' => $project->fresh(['components', 'defaultAssignee']),
        ]);
    }
}
