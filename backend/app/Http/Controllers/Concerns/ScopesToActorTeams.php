<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Team;
use App\Models\User;

/**
 * Who may see which employees. Super Admin, Admin and HR see everyone; anyone else (a Team Lead)
 * sees only the teams they lead or belong to, plus themselves. Audit 15 Nov 2026, finding H-03.
 */
trait ScopesToActorTeams
{
    protected function seesWholeCompany(?User $user): bool
    {
        return (bool) $user?->hasAnyRole(['Super Admin', 'Admin', 'HR']);
    }

    /** @return int[] team ids the user leads or belongs to */
    protected function actorTeamIds(User $user): array
    {
        $ids = Team::where('team_lead_id', $user->id)->pluck('id')->map(fn ($id) => (int) $id)->all();
        if ($user->team_id) {
            $ids[] = (int) $user->team_id;
        }

        return array_values(array_unique($ids));
    }

    /** Limit a User query to what the actor may see. */
    protected function scopeUsersToActor($query, User $user)
    {
        if ($this->seesWholeCompany($user)) {
            return $query;
        }

        return $query->where(function ($q) use ($user) {
            $q->whereIn('team_id', $this->actorTeamIds($user))->orWhere('id', $user->id);
        });
    }

    protected function actorMaySeeUser(User $actor, User $target): bool
    {
        if ($this->seesWholeCompany($actor) || $actor->id === $target->id) {
            return true;
        }

        return $target->team_id !== null && in_array((int) $target->team_id, $this->actorTeamIds($actor), true);
    }
}
