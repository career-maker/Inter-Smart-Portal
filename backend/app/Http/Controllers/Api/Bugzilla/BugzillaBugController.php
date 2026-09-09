<?php

namespace App\Http\Controllers\Api\Bugzilla;

use App\Http\Controllers\Controller;
use App\Models\BugzillaBug;
use App\Models\BugzillaHistory;
use App\Models\BugzillaLabel;
use App\Models\BugzillaProject;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Services\BugzillaAuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BugzillaBugController extends Controller
{
    /**
     * Advanced bug list with filtering, search, sorting, and pagination.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canView($user)) {
            return response()->json(['message' => 'Bugzilla access denied.'], 403);
        }

        $query = BugzillaBug::with([
            'bugzillaProject:id,name,portal_project_id',
            'portalProject:id,name,team_id',
            'component:id,name',
            'reporter:id,first_name,last_name,email',
            'assignee:id,first_name,last_name,email',
            'labels:id,name',
        ])
        ->withCount(['comments', 'attachments']);

        // Team isolation if not super admin and no cross-team permission
        if (!BugzillaAuthService::isSuperAdmin($user) && !\App\Models\CustomTeamPermission::userHasPermission($user, 'task_cross_team_view')) {
            $userTeamIds = BugzillaAuthService::resolveUserTeamIds($user);
            $query->whereHas('portalProject', function ($q) use ($userTeamIds) {
                $q->whereIn('team_id', $userTeamIds);
            });
        }

        // Quick filter tabs
        $quickFilter = $request->query('quick_filter');
        if ($quickFilter === 'my_bugs') {
            $query->where(function ($q) use ($user) {
                $q->where('assignee_id', $user->id)
                  ->orWhere('reporter_id', $user->id);
            });
        } elseif ($quickFilter === 'assigned_to_me') {
            $query->where('assignee_id', $user->id);
        } elseif ($quickFilter === 'reported_by_me') {
            $query->where('reporter_id', $user->id);
        } elseif ($quickFilter === 'open') {
            $query->whereNotIn('status', ['RESOLVED', 'CLOSED']);
        } elseif ($quickFilter === 'critical') {
            $query->whereIn('severity', ['BLOCKER', 'CRITICAL'])
                  ->whereNotIn('status', ['RESOLVED', 'CLOSED']);
        } elseif ($quickFilter === 'unassigned') {
            $query->whereNull('assignee_id')
                  ->whereNotIn('status', ['RESOLVED', 'CLOSED']);
        } elseif ($quickFilter === 'resolved') {
            $query->where('status', 'RESOLVED');
        } elseif ($quickFilter === 'closed') {
            $query->where('status', 'CLOSED');
        } elseif ($quickFilter === 'reopened') {
            $query->where('status', 'REOPENED');
        }

        // Free-text search
        if ($search = trim($request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('bug_number', 'ilike', "%{$search}%")
                  ->orWhere('summary', 'ilike', "%{$search}%")
                  ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        // Project filter
        if ($request->filled('project_id') && $request->query('project_id') !== 'all') {
            $query->where('bugzilla_project_id', $request->query('project_id'));
        }

        // Portal project filter
        if ($request->filled('portal_project_id') && $request->query('portal_project_id') !== 'all') {
            $query->where('portal_project_id', $request->query('portal_project_id'));
        }

        // Component filter
        if ($request->filled('component_id') && $request->query('component_id') !== 'all') {
            $query->where('component_id', $request->query('component_id'));
        }

        // Status filter
        if ($request->filled('status') && $request->query('status') !== 'all') {
            $query->where('status', $request->query('status'));
        }

        // Resolution filter
        if ($request->filled('resolution') && $request->query('resolution') !== 'all') {
            $query->where('resolution', $request->query('resolution'));
        }

        // Severity filter
        if ($request->filled('severity') && $request->query('severity') !== 'all') {
            $query->where('severity', $request->query('severity'));
        }

        // Priority filter
        if ($request->filled('priority') && $request->query('priority') !== 'all') {
            $query->where('priority', $request->query('priority'));
        }

        // Assignee filter
        if ($request->filled('assignee_id') && $request->query('assignee_id') !== 'all') {
            if ($request->query('assignee_id') === 'unassigned') {
                $query->whereNull('assignee_id');
            } else {
                $query->where('assignee_id', $request->query('assignee_id'));
            }
        }

        // Reporter filter
        if ($request->filled('reporter_id') && $request->query('reporter_id') !== 'all') {
            $query->where('reporter_id', $request->query('reporter_id'));
        }

        // Task filter
        if ($request->filled('task_id')) {
            $query->where('task_id', $request->query('task_id'));
        }

        // Sorting
        $sortField = $request->query('sort_by', 'created_at');
        $sortDirection = strtolower($request->query('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $allowedSorts = ['bug_number', 'summary', 'severity', 'priority', 'status', 'resolution', 'created_at', 'updated_at'];
        if (in_array($sortField, $allowedSorts, true)) {
            $query->orderBy($sortField, $sortDirection);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $perPage = min(max((int) $request->query('per_page', 25), 10), 100);
        $bugs = $query->paginate($perPage);

        return response()->json([
            'bugs' => $bugs,
            'capabilities' => BugzillaAuthService::getCapabilitiesPayload($user),
        ]);
    }

    /**
     * Check for potential duplicate bugs based on title/summary keywords.
     */
    public function checkDuplicates(Request $request)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canView($user)) {
            return response()->json(['duplicates' => []]);
        }

        $summary = trim($request->input('summary', ''));
        if (strlen($summary) < 3) {
            return response()->json(['duplicates' => []]);
        }

        $projectId = $request->input('bugzilla_project_id');

        // Extract key words (>3 chars)
        $words = array_filter(explode(' ', preg_replace('/[^\w\s]/', '', $summary)), fn($w) => strlen($w) >= 3);
        if (empty($words)) {
            return response()->json(['duplicates' => []]);
        }

        $query = BugzillaBug::select('id', 'bug_number', 'summary', 'status', 'severity', 'priority', 'bugzilla_project_id')
            ->with('bugzillaProject:id,name')
            ->where(function ($q) use ($words) {
                foreach (array_slice($words, 0, 4) as $word) {
                    $q->orWhere('summary', 'ilike', "%{$word}%");
                }
            });

        if ($projectId) {
            $query->where('bugzilla_project_id', $projectId);
        }

        $duplicates = $query->limit(6)->get();

        return response()->json([
            'duplicates' => $duplicates,
        ]);
    }

    /**
     * Report / File a new bug.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canReport($user)) {
            return response()->json(['message' => 'You do not have permission to file new Bugzilla bugs (Reporter capability required).'], 403);
        }

        $validated = $request->validate([
            'portal_project_id' => 'required|integer|exists:pm_projects,id',
            'bugzilla_project_id' => 'nullable|integer|exists:bugzilla_projects,id',
            'task_id' => 'nullable|integer|exists:pm_tasks,id',
            'component_id' => 'nullable|integer|exists:bugzilla_components,id',
            'summary' => 'required|string|max:255',
            'description' => 'required|string',
            'steps_to_reproduce' => 'nullable|string',
            'expected_result' => 'nullable|string',
            'actual_result' => 'nullable|string',
            'environment' => 'nullable|string|max:150',
            'browser' => 'nullable|string|max:150',
            'device' => 'nullable|string|max:150',
            'severity' => 'sometimes|in:BLOCKER,CRITICAL,MAJOR,NORMAL,MINOR,TRIVIAL',
            'priority' => 'sometimes|in:P1,P2,P3,P4,P5',
            'assignee_id' => 'nullable|integer|exists:users,id',
            'labels' => 'nullable|array',
            'labels.*' => 'string|max:50',
            'linked_pm_bug_id' => 'nullable|integer|exists:pm_task_bugs,id',
        ]);

        // Resolve Bugzilla Project from Portal Project
        $portalProjectId = (int) $validated['portal_project_id'];
        if (!BugzillaAuthService::canAccessProject($user, $portalProjectId)) {
            return response()->json(['message' => 'You do not have access to this Portal Project.'], 403);
        }

        $bzProject = BugzillaProject::where('portal_project_id', $portalProjectId)->first();
        if (!$bzProject) {
            // Auto-create on the fly if not existing
            $portalProject = Project::findOrFail($portalProjectId);
            $bzProject = BugzillaProject::create([
                'portal_project_id' => $portalProjectId,
                'name' => $portalProject->name,
                'description' => $portalProject->description,
                'status' => 'active',
                'created_by' => $user->id,
            ]);
            $bzProject->components()->create(['name' => 'General', 'status' => 'active']);
        }

        // Determine assignee: provided, or component default, or project default
        $assigneeId = $validated['assignee_id'] ?? null;
        if (!$assigneeId && !empty($validated['component_id'])) {
            $comp = \App\Models\BugzillaComponent::find($validated['component_id']);
            $assigneeId = $comp?->default_assignee_id;
        }
        if (!$assigneeId) {
            $assigneeId = $bzProject->default_assignee_id;
        }

        $bug = DB::transaction(function () use ($validated, $user, $bzProject, $portalProjectId, $assigneeId) {
            $bugNumber = BugzillaBug::generateNextBugNumber();

            $createdBug = BugzillaBug::create([
                'bug_number' => $bugNumber,
                'bugzilla_project_id' => $bzProject->id,
                'portal_project_id' => $portalProjectId,
                'task_id' => $validated['task_id'] ?? null,
                'component_id' => $validated['component_id'] ?? null,
                'reporter_id' => $user->id, // Reporter is ALWAYS authenticated user
                'assignee_id' => $assigneeId,
                'summary' => trim($validated['summary']),
                'description' => trim($validated['description']),
                'steps_to_reproduce' => $validated['steps_to_reproduce'] ?? null,
                'expected_result' => $validated['expected_result'] ?? null,
                'actual_result' => $validated['actual_result'] ?? null,
                'environment' => $validated['environment'] ?? null,
                'browser' => $validated['browser'] ?? null,
                'device' => $validated['device'] ?? null,
                'severity' => $validated['severity'] ?? 'NORMAL',
                'priority' => $validated['priority'] ?? 'P3',
                'status' => 'NEW',
                'resolution' => null,
                'linked_pm_bug_id' => $validated['linked_pm_bug_id'] ?? null,
            ]);

            // Add labels if any
            if (!empty($validated['labels'])) {
                foreach ($validated['labels'] as $lbl) {
                    $clean = trim($lbl);
                    if ($clean) {
                        $labelObj = BugzillaLabel::firstOrCreate(['name' => strtolower($clean)]);
                        $createdBug->labels()->syncWithoutDetaching([$labelObj->id]);
                    }
                }
            }

            // Auto-watch by reporter
            $createdBug->watchers()->create(['user_id' => $user->id]);

            // Log history
            BugzillaHistory::logChange($createdBug->id, $user->id, 'created', null, null, "Bug {$bugNumber} created with status NEW");

            return $createdBug;
        });

        return response()->json([
            'message' => "Bug {$bug->bug_number} filed successfully.",
            'bug' => $bug->load(['bugzillaProject', 'portalProject', 'component', 'assignee', 'reporter', 'labels']),
        ], 201);
    }

    /**
     * Show complete bug detail view.
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canView($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $bug = BugzillaBug::with([
            'bugzillaProject',
            'bugzillaProject.components',
            'portalProject.team',
            'portalProject.coordinator',
            'task:id,title,status,priority,due_date,project_id',
            'component',
            'reporter:id,first_name,last_name,email',
            'assignee:id,first_name,last_name,email',
            'duplicateOf:id,bug_number,summary,status',
            'duplicates:id,bug_number,summary,status,duplicate_of_bug_id',
            'linkedPmBug',
            'comments.user:id,first_name,last_name,email',
            'attachments.uploader:id,first_name,last_name',
            'labels',
            'history.user:id,first_name,last_name',
            'dependencies.dependsOnBug:id,bug_number,summary,status,severity,priority',
            'blocks.bug:id,bug_number,summary,status,severity,priority',
            'watchers.user:id,first_name,last_name,email',
        ])
        ->findOrFail($id);

        if (!BugzillaAuthService::canAccessProject($user, $bug->portal_project_id)) {
            return response()->json(['message' => 'You do not have permission to view this bug.'], 403);
        }

        $isWatching = $bug->watchers()->where('user_id', $user->id)->exists();

        return response()->json([
            'bug' => $bug,
            'is_watching' => $isWatching,
            'capabilities' => BugzillaAuthService::getCapabilitiesPayload($user),
        ]);
    }

    /**
     * Update bug fields with audit logging and capability checks.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canView($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $bug = BugzillaBug::findOrFail($id);

        if (!BugzillaAuthService::canAccessProject($user, $bug->portal_project_id)) {
            return response()->json(['message' => 'Unauthorized project access.'], 403);
        }

        $canDevelop = BugzillaAuthService::canDevelop($user);
        $isReporter = (int) $bug->reporter_id === (int) $user->id;
        $canReport = BugzillaAuthService::canReport($user) && $isReporter;

        if (!$canDevelop && !$canReport) {
            return response()->json(['message' => 'You do not have permission to edit this bug.'], 403);
        }

        // Rules based on role
        $rules = [];
        // Reporter-editable fields
        if ($canReport || $canDevelop) {
            $rules['summary'] = 'sometimes|required|string|max:255';
            $rules['description'] = 'sometimes|required|string';
            $rules['steps_to_reproduce'] = 'nullable|string';
            $rules['expected_result'] = 'nullable|string';
            $rules['actual_result'] = 'nullable|string';
            $rules['environment'] = 'nullable|string|max:150';
            $rules['browser'] = 'nullable|string|max:150';
            $rules['device'] = 'nullable|string|max:150';
        }

        // Developer-only fields
        if ($canDevelop) {
            $rules['status'] = 'sometimes|in:UNCONFIRMED,NEW,ASSIGNED,IN_PROGRESS,RESOLVED,VERIFIED,CLOSED,REOPENED';
            $rules['resolution'] = 'nullable|in:FIXED,INVALID,WONTFIX,DUPLICATE,WORKSFORME,INCOMPLETE';
            $rules['severity'] = 'sometimes|in:BLOCKER,CRITICAL,MAJOR,NORMAL,MINOR,TRIVIAL';
            $rules['priority'] = 'sometimes|in:P1,P2,P3,P4,P5';
            $rules['assignee_id'] = 'nullable|integer|exists:users,id';
            $rules['component_id'] = 'nullable|integer|exists:bugzilla_components,id';
            $rules['duplicate_of_bug_id'] = 'nullable|integer|exists:bugzilla_bugs,id';
            $rules['labels'] = 'nullable|array';
            $rules['labels.*'] = 'string|max:50';
        }

        $validated = $request->validate($rules);

        DB::transaction(function () use ($bug, $validated, $user, $canDevelop) {
            // Check diffs for each field and record history
            foreach ($validated as $key => $newVal) {
                if ($key === 'labels') {
                    continue;
                }

                $oldVal = $bug->{$key};
                if ($oldVal != $newVal) {
                    BugzillaHistory::logChange(
                        $bug->id,
                        $user->id,
                        'updated',
                        $key,
                        is_scalar($oldVal) ? (string) $oldVal : json_encode($oldVal),
                        is_scalar($newVal) ? (string) $newVal : json_encode($newVal)
                    );
                }
            }

            // Lifecycle timestamp triggers
            if (isset($validated['status'])) {
                if ($validated['status'] === 'RESOLVED' && $bug->status !== 'RESOLVED') {
                    $validated['resolved_at'] = now();
                    if (empty($validated['resolution'])) {
                        $validated['resolution'] = 'FIXED';
                    }
                } elseif ($validated['status'] === 'CLOSED' && $bug->status !== 'CLOSED') {
                    $validated['closed_at'] = now();
                } elseif ($validated['status'] === 'REOPENED') {
                    $validated['resolution'] = null;
                    $validated['resolved_at'] = null;
                    $validated['closed_at'] = null;
                }
            }

            $bug->update($validated);

            // Sync labels if provided by developer
            if ($canDevelop && isset($validated['labels'])) {
                $labelIds = [];
                foreach ($validated['labels'] as $lbl) {
                    $clean = trim($lbl);
                    if ($clean) {
                        $labelObj = BugzillaLabel::firstOrCreate(['name' => strtolower($clean)]);
                        $labelIds[] = $labelObj->id;
                    }
                }
                $bug->labels()->sync($labelIds);
            }
        });

        return response()->json([
            'message' => "Bug {$bug->bug_number} updated successfully.",
            'bug' => $bug->fresh([
                'bugzillaProject',
                'portalProject',
                'component',
                'reporter',
                'assignee',
                'labels',
                'history.user',
            ]),
        ]);
    }

    /**
     * Bulk update bugs (Developers only).
     */
    public function bulkUpdate(Request $request)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canDevelop($user)) {
            return response()->json(['message' => 'Developer permission required for bulk actions.'], 403);
        }

        $validated = $request->validate([
            'bug_ids' => 'required|array|min:1',
            'bug_ids.*' => 'integer|exists:bugzilla_bugs,id',
            'status' => 'nullable|in:UNCONFIRMED,NEW,ASSIGNED,IN_PROGRESS,RESOLVED,VERIFIED,CLOSED,REOPENED',
            'resolution' => 'nullable|in:FIXED,INVALID,WONTFIX,DUPLICATE,WORKSFORME,INCOMPLETE',
            'severity' => 'nullable|in:BLOCKER,CRITICAL,MAJOR,NORMAL,MINOR,TRIVIAL',
            'priority' => 'nullable|in:P1,P2,P3,P4,P5',
            'assignee_id' => 'nullable|integer|exists:users,id',
        ]);

        $updatedCount = 0;
        $bugIds = $validated['bug_ids'];
        unset($validated['bug_ids']);

        // Clean out null updates
        $fieldsToUpdate = array_filter($validated, fn($v) => !is_null($v));
        if (empty($fieldsToUpdate)) {
            return response()->json(['message' => 'No attributes provided to update.'], 422);
        }

        DB::transaction(function () use ($bugIds, $fieldsToUpdate, $user, &$updatedCount) {
            foreach ($bugIds as $id) {
                $bug = BugzillaBug::find($id);
                if (!$bug || !BugzillaAuthService::canAccessProject($user, $bug->portal_project_id)) {
                    continue;
                }

                foreach ($fieldsToUpdate as $field => $newVal) {
                    $oldVal = $bug->{$field};
                    if ($oldVal != $newVal) {
                        BugzillaHistory::logChange($bug->id, $user->id, 'bulk_updated', $field, (string) $oldVal, (string) $newVal);
                    }
                }

                $bug->update($fieldsToUpdate);
                $updatedCount++;
            }
        });

        return response()->json([
            'message' => "Successfully updated {$updatedCount} bugs.",
            'updated_count' => $updatedCount,
        ]);
    }

    /**
     * Delete bug (Super Admin only).
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canManageSettings($user)) {
            return response()->json(['message' => 'Super Admin access required to delete bugs.'], 403);
        }

        $bug = BugzillaBug::findOrFail($id);
        $bugNumber = $bug->bug_number;
        $bug->delete();

        return response()->json([
            'message' => "Bug {$bugNumber} deleted successfully.",
        ]);
    }
}
