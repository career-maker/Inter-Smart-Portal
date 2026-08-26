<?php

namespace App\Services\ProjectManagement;

use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\User;
use App\Notifications\ProjectMemberAddedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectService
{
    public function __construct(
        private readonly ProjectAuthorizationService $auth,
        private readonly ProjectAuditLogger $auditLogger,
    ) {}

    public function createProject(array $data, User $actor, ?Request $request = null): Project
    {
        if (!empty($data['project_coordinator_id'])) {
            $this->assertCoordinatorEligible((int) $data['project_coordinator_id']);
        }

        if (empty($data['start_date'])) {
            $data['start_date'] = now()->toDateString();
        }
        if (empty($data['status'])) {
            $data['status'] = 'Planning';
        }

        $project = DB::transaction(function () use ($data, $actor) {
            return Project::create(array_merge($data, [
                'created_by' => $actor->id,
            ]));
        });

        $this->auditLogger->log($actor, 'pm.project.created', $project, [], $project->toArray(), $request);

        return $project;
    }

    public function updateProject(Project $project, array $data, User $actor, ?Request $request = null): Project
    {
        if (array_key_exists('project_coordinator_id', $data) && $data['project_coordinator_id']) {
            $this->assertCoordinatorEligible((int) $data['project_coordinator_id']);
        }

        $previous = $project->only(array_keys($data));

        $project->fill(array_merge($data, ['updated_by' => $actor->id]));
        $project->save();

        $action = array_key_exists('status', $data) && $data['status'] !== $previous['status']
            ? 'pm.project.status_changed'
            : 'pm.project.updated';

        $this->auditLogger->log($actor, $action, $project, $previous, $project->only(array_keys($data)), $request);

        return $project;
    }

    public function archiveProject(Project $project, User $actor, ?Request $request = null): void
    {
        $project->update(['updated_by' => $actor->id]);
        $project->delete(); // soft delete

        $this->auditLogger->log($actor, 'pm.project.archived', $project, ['deleted_at' => null], ['deleted_at' => now()->toIso8601String()], $request);
    }

    public function addMember(Project $project, int $userId, string $projectRole, User $actor, ?Request $request = null): ProjectMember
    {
        if (!in_array($projectRole, ProjectMember::ROLES, true)) {
            throw ValidationException::withMessages([
                'project_role' => 'project_role must be one of: ' . implode(', ', ProjectMember::ROLES) . '.',
            ]);
        }

        $member = ProjectMember::firstOrCreate(
            ['project_id' => $project->id, 'user_id' => $userId],
            ['project_role' => $projectRole, 'added_by' => $actor->id]
        );

        if ($member->wasRecentlyCreated) {
            $this->auditLogger->log($actor, 'pm.project.member_added', $project, [], ['user_id' => $userId, 'project_role' => $projectRole], $request);

            try {
                $addedUser = User::find($userId);
                if ($addedUser && $addedUser->id !== $actor->id) {
                    $addedUser->notify(new ProjectMemberAddedNotification(
                        $project,
                        "{$actor->first_name} {$actor->last_name} added you to the project \"{$project->name}\"."
                    ));
                }
            } catch (\Throwable $e) {
                \Log::warning('ProjectMemberAddedNotification failed: ' . $e->getMessage());
            }
        }

        return $member;
    }

    public function removeMember(Project $project, int $userId, User $actor, ?Request $request = null): void
    {
        $deleted = ProjectMember::where('project_id', $project->id)->where('user_id', $userId)->delete();

        if ($deleted) {
            $this->auditLogger->log($actor, 'pm.project.member_removed', $project, ['user_id' => $userId], [], $request);
        }
    }

    /**
     * Server-side enforcement of Project Coordinator eligibility — a user
     * may only be assigned as a coordinator if they belong to the real,
     * existing HR "Project Coordinators" department. Checked here (not
     * only in a FormRequest `exists:` rule) because this is a business
     * rule about WHICH valid user is acceptable, not just whether the ID
     * exists at all.
     */
    public function assertCoordinatorEligible(int $userId): void
    {
        $user = User::find($userId);

        if (!$user) {
            throw ValidationException::withMessages([
                'project_coordinator_id' => 'The selected coordinator does not exist.',
            ]);
        }

        if (!$this->auth->isEligibleCoordinator($user)) {
            throw ValidationException::withMessages([
                'project_coordinator_id' => 'The selected user is not eligible to be a Project Coordinator — they must belong to the "Project Coordinators" department.',
            ]);
        }
    }
}
