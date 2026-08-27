<?php

namespace App\Services\ProjectManagement;

use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\User;

/**
 * PM authorization / object-level context resolution.
 *
 * Mirrors the ONLY real authorization pattern already used across the
 * HR Portal (LeaveRequestController::updateStatus, WfhRequestController::
 * updateStatus, AttendanceController::details): inline manual checks, no
 * Laravel Policies, no permission: route middleware. Route-level access
 * is `role:` middleware; capability-level is Spatie `$user->can(...)`;
 * object-level (this class) is everything else — is this user actually
 * a member/assignee/coordinator/team-match for THIS specific record.
 *
 * Project Coordinator is NOT a role, NOT a permission, and grants NOTHING
 * by department membership alone — see resolveTaskCoordinator() /
 * isResolvedCoordinator() below and PROJECT_MANAGEMENT_MODULE_DESIGN.md §2.
 */
class ProjectAuthorizationService
{
    /** The exact, existing HR department name that makes a user Project-Coordinator-eligible. */
    public const COORDINATOR_DEPARTMENT_NAME = 'Project Coordinators';

    /**
     * Eligibility only — does NOT grant access to anything by itself.
     * A user is eligible to be *selected* as a coordinator only if they
     * belong to the real, existing HR "Project Coordinators" department.
     * Looked up by name (not a hardcoded team id — ids are not portable
     * across environments), matching the existing HR `teams` table.
     */
    public function isEligibleCoordinator(User $user): bool
    {
        // Allow any active employee to be designated as a project coordinator
        if ($user->status && strtolower($user->status) !== 'active') {
            return false;
        }

        return true;
    }

    public function isProjectMember(User $user, Project $project): bool
    {
        return $project->members()->where('users.id', $user->id)->exists();
    }

    public function isTaskAssignee(User $user, ProjectTask $task): bool
    {
        return $task->assignees()->where('users.id', $user->id)->exists();
    }

    /**
     * The coordinator actually resolved for a task: its own override if
     * set, otherwise the parent project's coordinator, otherwise null.
     */
    public function resolveTaskCoordinator(ProjectTask $task): ?User
    {
        return $task->coordinator ?? $task->project?->coordinator;
    }

    /** Is $user the resolved coordinator of this project (project-level only, no task override to consider)? */
    public function isProjectCoordinator(User $user, Project $project): bool
    {
        return $project->project_coordinator_id === $user->id;
    }

    /** Is $user the resolved coordinator for this specific task (task override, else the project's)? */
    public function isTaskCoordinator(User $user, ProjectTask $task): bool
    {
        $resolved = $this->resolveTaskCoordinator($task);

        return $resolved !== null && $resolved->id === $user->id;
    }

    /**
     * Can $user view this project — membership, coordination, own-team
     * Team Lead, `view all projects`, or Super Admin? Read-only check;
     * does not imply edit rights (see canManageProject()).
     */
    public function canViewProject(User $user, Project $project): bool
    {
        // All projects are accessible to Super Admin, Admin, and all Team Leads
        if (
            $user->hasRole('Super Admin') ||
            $user->hasRole('Admin') ||
            $user->hasRole('Team Lead') ||
            $user->can('view all projects') ||
            in_array(strtolower($user->role ?? ''), ['super admin', 'admin', 'team lead'], true)
        ) {
            return true;
        }

        if ($this->isProjectCoordinator($user, $project)) {
            return true;
        }

        if ($this->isProjectMember($user, $project)) {
            return true;
        }

        return false;
    }

    /** Can $user create/edit/delete this project, manage its members, or change its coordinator? */
    public function canManageProject(User $user, ?Project $project = null): bool
    {
        if ($user->hasRole('Super Admin')) {
            return true;
        }

        if (!$user->can('manage projects')) {
            return false;
        }

        // Creating a brand-new project: any `manage projects` holder may (their
        // own team is set explicitly at creation time, see ProjectService).
        if ($project === null) {
            return true;
        }

        return $user->hasRole('Team Lead')
            || $user->hasRole('Admin')
            || in_array(strtolower($user->role ?? ''), ['super admin', 'admin', 'team lead'], true);
    }

    /**
     * Can $user view this task — project visibility, task assignment, or
     * being its resolved coordinator?
     */
    public function canViewTask(User $user, ProjectTask $task): bool
    {
        if ($this->canViewProject($user, $task->project)) {
            return true;
        }

        return $this->isTaskAssignee($user, $task) || $this->isTaskCoordinator($user, $task);
    }

    /** Can $user edit planning fields (title, dates, effort, assignees, coordinator, ...) on this task? */
    public function canManageTask(User $user, ProjectTask $task): bool
    {
        if (
            $user->hasRole('Super Admin') ||
            $user->hasRole('Admin') ||
            in_array(strtolower($user->role ?? ''), ['super admin', 'admin'], true)
        ) {
            return true;
        }

        if (
            $user->hasRole('Team Lead') ||
            in_array(strtolower($user->role ?? ''), ['team lead'], true) ||
            \App\Models\Team::where('team_lead_id', $user->id)->exists()
        ) {
            return true;
        }

        return $user->can('manage tasks');
    }

    /**
     * Can $user create a task under $project?
     * Super Admin, Admin, and all Team Leads can create tasks under any project.
     */
    public function canCreateTask(User $user, Project $project): bool
    {
        if (
            $user->hasRole('Super Admin') ||
            $user->hasRole('Admin') ||
            $user->hasRole('Team Lead') ||
            $user->can('manage tasks') ||
            in_array(strtolower($user->role ?? ''), ['super admin', 'admin', 'team lead'], true) ||
            \App\Models\Team::where('team_lead_id', $user->id)->exists()
        ) {
            return true;
        }

        return false;
    }

    /**
     * Legacy helper retained for compatibility.
     */
    public function canCreateTaskForTeam(User $user, ?int $teamId): bool
    {
        if (
            $user->hasRole('Super Admin') ||
            $user->hasRole('Admin') ||
            $user->hasRole('Team Lead') ||
            $user->can('manage tasks') ||
            in_array(strtolower($user->role ?? ''), ['super admin', 'admin', 'team lead'], true) ||
            \App\Models\Team::where('team_lead_id', $user->id)->exists()
        ) {
            return true;
        }

        return false;
    }

    /** Can $user edit this task's own execution fields (status, current_updates, actual dates, time/days taken)? */
    public function canUpdateTaskExecution(User $user, ProjectTask $task): bool
    {
        return $this->canManageTask($user, $task) || $this->isTaskAssignee($user, $task);
    }

    /** Can $user comment on / log a bug against / raise a correction for this task? */
    public function canParticipateOnTask(User $user, ProjectTask $task): bool
    {
        return $this->canManageTask($user, $task)
            || $this->isTaskAssignee($user, $task)
            || $this->isTaskCoordinator($user, $task)
            || $this->isProjectMember($user, $task->project)
            || $this->isProjectCoordinator($user, $task->project);
    }

    /** Can $user add/remove members or set the coordinator on this project? */
    public function canManageProjectMembers(User $user, Project $project): bool
    {
        return $this->canManageProject($user, $project);
    }

    /**
     * Can $actor assign $targetUser to $task?
     * Super Admin can assign any user.
     * Team Lead can only assign users who belong to their own HR team.
     * Regular employees cannot assign tasks.
     */
    public function canAssignUserToTask(User $actor, ProjectTask $task, User $targetUser): bool
    {
        if ($actor->hasRole('Super Admin')) {
            return true;
        }

        if ($actor->hasRole('Team Lead')) {
            return $this->canManageTask($actor, $task)
                && $targetUser->team_id !== null
                && $targetUser->team_id === $actor->team_id;
        }

        return false;
    }
}
