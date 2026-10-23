<?php

namespace App\Support;

use App\Models\Project;
use App\Models\ProjectAcceptance;
use App\Models\ProjectBudgetAllocation;
use App\Models\Team;
use App\Models\User;

/**
 * Who may work inside a project's department screens (UI pages, sprints, QA, changes).
 * A person qualifies when they are a project manager, the project's coordinator, a member or lead of a department
 * that has a budget on the project, or a QA team member. Department names are matched by prefix: 'design' = UI, 'qa' = QA.
 */
class WorkAccess
{
    public static function allocatedTeamIds(Project $project): array
    {
        return ProjectBudgetAllocation::where('project_id', $project->id)->pluck('team_id')->all();
    }

    public static function ledTeamIds(User $user): array
    {
        return Team::where('team_lead_id', $user->id)->pluck('id')->all();
    }

    public static function canWork(User $user, Project $project): bool
    {
        if (Access::pmoManager($user) || $project->project_coordinator_id === $user->id || Access::inTeam($user, 'qa')) {
            return true;
        }
        $mine = array_filter(array_merge([$user->team_id], self::ledTeamIds($user)));

        return count(array_intersect($mine, self::allocatedTeamIds($project))) > 0;
    }

    /** Projects this person can work on. */
    public static function projectIds(User $user)
    {
        if (Access::pmoManager($user) || Access::inTeam($user, 'qa')) {
            return ProjectBudgetAllocation::select('project_id')->union(ProjectAcceptance::select('project_id'))->pluck('project_id')->unique()->values();
        }
        $teamIds = array_filter(array_merge([$user->team_id], self::ledTeamIds($user)));
        $ids = ProjectBudgetAllocation::whereIn('team_id', $teamIds)->pluck('project_id');

        return $ids->merge(Project::where('project_coordinator_id', $user->id)->pluck('id'))->unique()->values();
    }

    public static function hasAnyWork(User $user): bool
    {
        return Access::pmoManager($user) || Access::inTeam($user, 'qa') || self::projectIds($user)->isNotEmpty();
    }

    // ---- UI department ---------------------------------------------------------

    public static function uiTeamIds(): array
    {
        return Team::where('name', 'like', 'design%')->pluck('id')->all();
    }

    public static function isUiMember(User $user): bool
    {
        return Access::inTeam($user, 'design');
    }

    public static function isUiLead(User $user): bool
    {
        return Team::where('team_lead_id', $user->id)->where('name', 'like', 'design%')->exists();
    }

    /** Create pages, set budgets, assign, raise the section count: UI lead, coordinator, project manager. */
    public static function canManageUi(User $user, Project $project): bool
    {
        return Access::pmoManager($user) || $project->project_coordinator_id === $user->id || self::isUiLead($user);
    }

    /** Edit sections and move pages along the status chain. */
    public static function canWorkUi(User $user, Project $project): bool
    {
        return self::canManageUi($user, $project) || self::isUiMember($user);
    }

    /** Total budget the project manager gave the design department(s). */
    public static function uiBudgetCap(Project $project): float
    {
        return (float) ProjectBudgetAllocation::where('project_id', $project->id)->whereIn('team_id', self::uiTeamIds())->sum('amount');
    }

    // ---- UX / Dev sprints -------------------------------------------------------

    /** Departments that can run sprints on a project: the ones with a budget, except the office and design/QA teams. */
    public static function sprintTeamIds(Project $project): array
    {
        return Team::whereIn('id', self::allocatedTeamIds($project))->get()
            ->reject(fn ($t) => preg_match('/^(pmo|sales|accounts|design|qa)/i', trim($t->name)))->pluck('id')->all();
    }

    public static function isLeadOf(User $user, int $teamId): bool
    {
        return Team::where('id', $teamId)->where('team_lead_id', $user->id)->exists();
    }

    /** Plan the sprint, edit items, submit, schedule: the department's team lead or the project manager. */
    public static function canManageSprint(User $user, int $teamId): bool
    {
        return Access::pmoManager($user) || self::isLeadOf($user, $teamId);
    }

    /** Refuse (HTTP 423) when the project's tab is still locked by the payment or budget lock. */
    public static function requireOpenTab(Project $project, string $tab): void
    {
        $t = ProjectGate::state($project)['tabs']->firstWhere('key', $tab);
        abort_unless($t && $t['enabled'], 423, $t['locked_reason'] ?? 'This tab is locked.');
    }
}
