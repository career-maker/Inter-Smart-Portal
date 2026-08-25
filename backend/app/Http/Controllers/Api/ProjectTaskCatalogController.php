<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProjectTaskCatalogRequest;
use App\Http\Requests\UpdateProjectTaskCatalogRequest;
use App\Models\ProjectTaskCatalog;
use App\Services\ProjectManagement\ProjectAuditLogger;
use Illuminate\Http\Request;

class ProjectTaskCatalogController extends Controller
{
    public function __construct(
        private readonly ProjectAuditLogger $auditLogger,
    ) {}

    /**
     * List task catalog items.
     * Non-Super-Admins receive active items only.
     * Super Admins can filter by active state and search for administration.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin');

        $query = ProjectTaskCatalog::query();

        // Non-admin callers only ever see active catalog items for task creation
        if (!$isSuperAdmin) {
            $query->where('is_active', true);
        } else {
            if ($request->has('is_active')) {
                $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
            }
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('category', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        // If 'all=true' is requested (e.g. for dropdowns) return unpaginated list
        if ($request->boolean('all') || !$isSuperAdmin) {
            $items = $query->orderBy('category')->orderBy('name')->get();
            return response()->json(['data' => $items]);
        }

        $items = $query->orderBy('category')->orderBy('name')->paginate(25);
        return response()->json($items);
    }

    /**
     * Create a new predefined catalog entry (Super Admin only).
     */
    public function store(StoreProjectTaskCatalogRequest $request)
    {
        $user = $request->user();

        if (!$user->hasRole('Super Admin')) {
            return response()->json(['message' => 'Unauthorized. Only Super Admin may manage the task catalog.'], 403);
        }

        $data = $request->validated();
        $catalog = ProjectTaskCatalog::create(array_merge($data, [
            'created_by' => $user->id,
            'is_active' => $data['is_active'] ?? true,
        ]));

        $this->auditLogger->log($user, 'pm.task_catalog.created', $catalog, [], $catalog->toArray(), $request);

        return response()->json([
            'message' => 'Task catalog item created successfully.',
            'data' => $catalog,
        ], 201);
    }

    /**
     * View single catalog entry.
     */
    public function show(Request $request, ProjectTaskCatalog $catalog)
    {
        return response()->json(['data' => $catalog->load(['creator:id,first_name,last_name', 'updater:id,first_name,last_name'])]);
    }

    /**
     * Update an existing catalog entry (Super Admin only).
     */
    public function update(UpdateProjectTaskCatalogRequest $request, ProjectTaskCatalog $catalog)
    {
        $user = $request->user();

        if (!$user->hasRole('Super Admin')) {
            return response()->json(['message' => 'Unauthorized. Only Super Admin may manage the task catalog.'], 403);
        }

        $data = $request->validated();
        $previous = $catalog->only(array_keys($data));

        $catalog->fill(array_merge($data, ['updated_by' => $user->id]));
        $catalog->save();

        $action = 'pm.task_catalog.updated';
        if (array_key_exists('is_active', $data) && $data['is_active'] !== ($previous['is_active'] ?? null)) {
            $action = $catalog->is_active ? 'pm.task_catalog.activated' : 'pm.task_catalog.deactivated';
        }

        $this->auditLogger->log($user, $action, $catalog, $previous, $catalog->only(array_keys($data)), $request);

        return response()->json([
            'message' => 'Task catalog item updated successfully.',
            'data' => $catalog,
        ]);
    }

    /**
     * Soft delete a catalog entry (Super Admin only).
     */
    public function destroy(Request $request, ProjectTaskCatalog $catalog)
    {
        $user = $request->user();

        if (!$user->hasRole('Super Admin')) {
            return response()->json(['message' => 'Unauthorized. Only Super Admin may manage the task catalog.'], 403);
        }

        $catalog->update(['updated_by' => $user->id]);
        $catalog->delete();

        $this->auditLogger->log($user, 'pm.task_catalog.deleted', $catalog, ['deleted_at' => null], ['deleted_at' => now()->toIso8601String()], $request);

        return response()->json(['message' => 'Task catalog item archived successfully.']);
    }
}
