<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AddProjectMemberRequest;
use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Models\Project;
use App\Services\ProjectManagement\ProjectAuthorizationService;
use App\Services\ProjectManagement\ProjectService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ProjectController extends Controller
{
    public function __construct(
        private readonly ProjectAuthorizationService $auth,
        private readonly ProjectService $projects,
    ) {}

    /**
     * Scoped list: Employee sees projects they're a member of or
     * coordinate; Team Lead sees their own team's + coordinated;
     * Super Admin / `view all projects` holders see everything.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Project::query()->with(['team:id,name', 'coordinator:id,first_name,last_name']);

        $canViewAll = $user->hasRole('Super Admin')
            || $user->hasRole('Admin')
            || $user->hasRole('Team Lead')
            || $user->can('view all projects')
            || in_array(strtolower($user->role ?? ''), ['super admin', 'admin', 'team lead'], true);

        if (!$canViewAll) {
            $query->where(function ($q) use ($user) {
                $q->where('project_coordinator_id', $user->id)
                  ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('team_id')) {
            $query->where('team_id', (int) $request->input('team_id'));
        }
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->string('search') . '%');
        }

                $perPage = $request->input('per_page', 20);
        if ($perPage === 'all' || (int) $perPage === -1) {
            $items = $query->orderBy('created_at', 'desc')->get();
            return response()->json([
                'data' => $items,
                'total' => $items->count(),
                'current_page' => 1,
                'last_page' => 1,
            ]);
        }

        return response()->json($query->orderBy('created_at', 'desc')->paginate((int) $perPage));
    }

    public function store(StoreProjectRequest $request)
    {
        $user = $request->user();

        if (!$this->auth->canManageProject($user)) {
            return response()->json(['message' => 'Unauthorized to create projects.'], 403);
        }

        $data = $request->validated();

        // A Team Lead (non-Super-Admin) may only create projects owned by
        // their own team — defaults to it if not supplied, rejects any
        // attempt to set a different team via the request.
        if (!$user->hasRole('Super Admin')) {
            if (isset($data['team_id']) && $data['team_id'] !== $user->team_id) {
                return response()->json(['message' => 'You may only create projects for your own team.'], 403);
            }
            $data['team_id'] = $data['team_id'] ?? $user->team_id;
        }

        $project = $this->projects->createProject($data, $user, $request);

        return response()->json(['message' => 'Project created successfully.', 'data' => $project], 201);
    }

    public function show(Request $request, Project $project)
    {
        $user = $request->user();

        if (!$this->auth->canViewProject($user, $project)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $project->load(['team:id,name', 'coordinator:id,first_name,last_name,email', 'creator:id,first_name,last_name']);

        return response()->json(['data' => $project]);
    }

    public function update(UpdateProjectRequest $request, Project $project)
    {
        $user = $request->user();

        if (!$this->auth->canManageProject($user, $project)) {
            return response()->json(['message' => 'Unauthorized to edit this project.'], 403);
        }

        $project = $this->projects->updateProject($project, $request->validated(), $user, $request);

        return response()->json(['message' => 'Project updated successfully.', 'data' => $project]);
    }

    /** Archive (soft delete) — never a hard delete, preserves the PM audit trail. */
    public function destroy(Request $request, Project $project)
    {
        $user = $request->user();

        if (!$this->auth->canManageProject($user, $project)) {
            return response()->json(['message' => 'Unauthorized to archive this project.'], 403);
        }

        $this->projects->archiveProject($project, $user, $request);

        return response()->json(['message' => 'Project archived successfully.']);
    }

    public function members(Request $request, Project $project)
    {
        $user = $request->user();

        if (!$this->auth->canViewProject($user, $project)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        return response()->json([
            'data' => $project->members()->select('users.id', 'first_name', 'last_name', 'employee_code')->get(),
        ]);
    }

    public function addMember(AddProjectMemberRequest $request, Project $project)
    {
        $user = $request->user();

        if (!$this->auth->canManageProjectMembers($user, $project)) {
            return response()->json(['message' => 'Unauthorized to manage members of this project.'], 403);
        }

        $data = $request->validated();
        $member = $this->projects->addMember($project, (int) $data['user_id'], $data['project_role'] ?? 'Member', $user, $request);

        return response()->json(['message' => 'Member added successfully.', 'data' => $member], 201);
    }

    public function removeMember(Request $request, Project $project, int $userId)
    {
        $user = $request->user();

        if (!$this->auth->canManageProjectMembers($user, $project)) {
            return response()->json(['message' => 'Unauthorized to manage members of this project.'], 403);
        }

        $this->projects->removeMember($project, $userId, $user, $request);

        return response()->json(['message' => 'Member removed successfully.']);
    }

    /**
     * Assign or change the project's coordinator. Server-side department
     * eligibility check happens inside ProjectService::updateProject() /
     * assertCoordinatorEligible() — never trusted from the client, and
     * never implemented as a role or permission grant.
     */
    public function setCoordinator(Request $request, Project $project)
    {
        $user = $request->user();

        if (!$this->auth->canManageProject($user, $project)) {
            return response()->json(['message' => 'Unauthorized to set this project\'s coordinator.'], 403);
        }

        $request->validate([
            'project_coordinator_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $project = $this->projects->updateProject($project, [
            'project_coordinator_id' => $request->input('project_coordinator_id'),
        ], $user, $request);

        return response()->json(['message' => 'Project coordinator updated successfully.', 'data' => $project]);
    }
}
