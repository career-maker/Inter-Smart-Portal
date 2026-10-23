<?php

namespace App\Support;

use App\Models\User;

/**
 * Module access by department (team) membership. A person belongs to the module's team
 * (for example the "Accounts" team) or is a Super Admin. An explicit Spatie role of the
 * same name also works, so access can be granted without moving someone between teams.
 */
class Access
{
    public static function inTeam(?User $user, string $teamNameStart): bool
    {
        $name = $user?->team?->name;

        return $name !== null && str_starts_with(strtolower(trim($name)), strtolower($teamNameStart));
    }

    public static function accounts(?User $user): bool
    {
        return $user !== null
            && ($user->hasAnyRole(['Super Admin', 'Accounts']) || self::inTeam($user, 'accounts'));
    }

    public static function sales(?User $user): bool
    {
        return $user !== null && ($user->hasRole('Super Admin') || self::inTeam($user, 'sales'));
    }

    /** Super Admin and the lead of a Sales team see every salesperson's records; others see their own. */
    public static function salesSeesAll(User $user): bool
    {
        return $user->hasRole('Super Admin')
            || \App\Models\Team::where('team_lead_id', $user->id)->where('name', 'like', 'sales%')->exists();
    }

    /** Project Office: Super Admin or anyone in a PMO team (coordinators). */
    public static function pmo(?User $user): bool
    {
        return $user !== null && ($user->hasRole('Super Admin') || self::inTeam($user, 'pmo'));
    }

    /** Project manager powers (assign, budget, hold, approve): Super Admin or the lead of a PMO team. */
    public static function pmoManager(User $user): bool
    {
        return $user->hasRole('Super Admin')
            || \App\Models\Team::where('team_lead_id', $user->id)->where('name', 'like', 'pmo%')->exists();
    }

    /** Everyone with project-manager powers: Super Admins and the leads of PMO teams. */
    public static function pmoManagers()
    {
        $leads = \App\Models\Team::where('name', 'like', 'pmo%')->pluck('team_lead_id')->filter();

        return User::whereIn('id', $leads)
            ->orWhereHas('roles', fn ($q) => $q->where('name', 'Super Admin'))
            ->get();
    }

    /** Members of departments whose name starts with any of the given words (e.g. "PMO 1", "PMO 2"). */
    public static function teamMembers(array $teamNameStarts)
    {
        return User::with('team')->whereNotNull('team_id')->get()
            ->filter(fn ($u) => collect($teamNameStarts)->contains(fn ($s) => self::inTeam($u, $s)));
    }
}
