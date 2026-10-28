<?php

namespace App\Support;

use App\Models\SystemSetting;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

/**
 * Module privileges. The portal's login roles are only Super Admin, Employee and Team Lead; everything else (Accounts, Sales, Project Office,
 * project manager, HR, QA, system administrator ...) is a PRIVILEGE the Super Admin assigns in the Portal Customization add-on:
 * to named people and/or to whole teams (setting `access.<key>` = {"users":[ids],"teams":[ids]}).
 * Until the Super Admin saves a choice for a privilege, the old rule (see `legacy`) applies, so nothing changes by itself.
 */
class Access
{
    /** key => [label, what it unlocks, (optional) the privilege it follows until the Super Admin sets it separately]. Order is the order shown to the Super Admin. */
    public const PRIVILEGES = [
        'accounts' => ['Accounts', 'Accounts module: payments, budget increases, sales targets, AMC list'],
        'sales' => ['Sales', 'Sales module: leads, inbox, create projects, completed projects and AMC'],
        'sales_lead' => ['Sales lead (sees every salesperson)', 'Sees all leads and projects of all salespeople'],
        'pmo' => ['Project Office (coordinator)', 'Project Office screens and being a project coordinator'],
        'pmo_manager' => ['Project manager', 'Assign coordinators, budgets, hold, approve sprints and changes, out-of-budget list, tracker'],
        'qa' => ['QA tester', 'QA queue and QA reviews'],
        'qa_lead' => ['QA lead', 'Assigns and oversees QA reviews'],
        'system_admin' => ['System administrator', 'Go-live requests: allocate servers and mark projects live'],
        'hr' => ['HR', 'Approve appreciation, customer feedback after go-live, performance figures'],
        // Project Office powers: each follows "Project manager" until set separately, so any single power can be given, moved or removed
        'pmo_assign' => ['PMO power: assign the coordinator', 'Assign a coordinator to a project', 'pmo_manager'],
        'pmo_budget' => ['PMO power: department budgets', 'Set and raise the department budget split', 'pmo_manager'],
        'pmo_hold' => ['PMO power: hold and resume projects', 'Put a project on hold and resume it', 'pmo_manager'],
        'pmo_override' => ['PMO power: lock overrides', 'Open a budget-locked tab anyway', 'pmo_manager'],
        'pmo_approve' => ['PMO power: approvals', 'Approve or reject sprints, corrections and changes, out-of-scope work and extra design pages', 'pmo_manager'],
        'pmo_budget_views' => ['PMO power: out-of-budget list and tracker', 'See the out-of-budget list and use the project tracker', 'pmo_manager'],
    ];

    /** A single power: Super Admin, or the people given it (by default whoever is a project manager). */
    public static function can(string $key, ?User $user): bool
    {
        return $user !== null && ($user->hasRole('Super Admin') || self::has($key, $user));
    }

    /** @return array<string,array{users:int[],teams:int[]}> the saved choices, keyed by privilege */
    public static function settings(): array
    {
        return Cache::remember('access.settings', 60, function () {
            $out = [];
            foreach (SystemSetting::where('key', 'like', 'access.%')->get() as $row) {
                $v = json_decode((string) $row->value, true) ?: [];
                $out[substr($row->key, 7)] = ['users' => array_map('intval', $v['users'] ?? []), 'teams' => array_map('intval', $v['teams'] ?? [])];
            }

            return $out;
        });
    }

    public static function saveSetting(string $key, array $users, array $teams): void
    {
        abort_unless(isset(self::PRIVILEGES[$key]), 422, 'Unknown privilege.');
        SystemSetting::updateOrCreate(['key' => "access.{$key}"], ['value' => json_encode(['users' => array_values(array_unique(array_map('intval', $users))), 'teams' => array_values(array_unique(array_map('intval', $teams)))])]);
        Cache::forget('access.settings');
    }

    public static function resetSetting(string $key): void
    {
        SystemSetting::where('key', "access.{$key}")->delete();
        Cache::forget('access.settings');
    }

    /** Does this person hold the privilege (by the Super Admin's choice, or by the old rule if none was saved)? Super Admin is NOT implied here. */
    public static function has(string $key, ?User $user): bool
    {
        if ($user === null) {
            return false;
        }
        $cfg = self::settings()[$key] ?? null;
        if ($cfg !== null) {
            return in_array($user->id, $cfg['users'], true) || ($user->team_id !== null && in_array((int) $user->team_id, $cfg['teams'], true));
        }

        $follows = self::PRIVILEGES[$key][2] ?? null;

        return $follows !== null ? self::has($follows, $user) : self::legacy($key, $user);
    }

    /** Everyone holding the privilege (active people only). Super Admin is not added automatically. */
    public static function usersWith(string $key)
    {
        $cfg = self::settings()[$key] ?? null;
        if ($cfg !== null) {
            return User::with('team')->where('status', 'Active')->where(fn ($q) => $q->whereIn('id', $cfg['users'])->orWhereIn('team_id', $cfg['teams']))->get();
        }

        $follows = self::PRIVILEGES[$key][2] ?? null;
        if ($follows !== null) {
            return self::usersWith($follows);
        }

        return User::with('team')->where('status', 'Active')->get()->filter(fn ($u) => self::legacy($key, $u))->values();
    }

    /** The rule that applied before the Super Admin could assign privileges. */
    private static function legacy(string $key, User $user): bool
    {
        $leads = fn (string $prefix) => Team::where('team_lead_id', $user->id)->where('name', 'like', $prefix . '%')->exists();

        return match ($key) {
            'accounts' => $user->hasRole('Accounts') || self::teamStarts($user, 'accounts'),
            'sales' => self::teamStarts($user, 'sales'),
            'sales_lead' => $leads('sales'),
            'pmo' => self::teamStarts($user, 'pmo'),
            'pmo_manager' => $leads('pmo'),
            'qa' => self::teamStarts($user, 'qa'),
            'qa_lead' => $leads('qa'),
            'system_admin' => strtolower(trim((string) $user->designation)) === 'system administrator',
            'hr' => strtolower((string) $user->email) === 'hr@intersmart.in',
            default => false,
        };
    }

    private static function teamStarts(?User $user, string $prefix): bool
    {
        $name = $user?->team?->name;

        return $name !== null && str_starts_with(strtolower(trim($name)), strtolower($prefix));
    }

    /** Department test. The names that are privileges (accounts, sales, pmo, qa) follow the Super Admin's assignment; any other name is a plain team-name match. */
    public static function inTeam(?User $user, string $teamNameStart): bool
    {
        $k = strtolower($teamNameStart);

        return isset(self::PRIVILEGES[$k]) ? self::has($k, $user) : self::teamStarts($user, $teamNameStart);
    }

    public static function systemAdmin(?User $user): bool
    {
        return self::has('system_admin', $user);
    }

    public static function accounts(?User $user): bool
    {
        return $user !== null && ($user->hasRole('Super Admin') || self::has('accounts', $user));
    }

    public static function sales(?User $user): bool
    {
        return $user !== null && ($user->hasRole('Super Admin') || self::has('sales', $user));
    }

    /** Super Admin and Sales leads see every salesperson's records; others see their own. */
    public static function salesSeesAll(User $user): bool
    {
        return $user->hasRole('Super Admin') || self::has('sales_lead', $user);
    }

    /** Project Office: Super Admin or anyone given the Project Office privilege (coordinators). */
    public static function pmo(?User $user): bool
    {
        return $user !== null && ($user->hasRole('Super Admin') || self::has('pmo', $user));
    }

    /** Project manager powers (assign, budget, hold, approve): Super Admin or anyone given the Project manager privilege. */
    public static function pmoManager(User $user): bool
    {
        return $user->hasRole('Super Admin') || self::has('pmo_manager', $user);
    }

    /** Everyone with project-manager powers: Super Admins and the people given the Project manager privilege. */
    public static function pmoManagers()
    {
        return User::role('Super Admin')->get()->merge(self::usersWith('pmo_manager'))->unique('id')->values();
    }

    public static function qa(?User $user): bool
    {
        return self::has('qa', $user);
    }

    /** Members of departments or holders of the privilege named by any of the given words (e.g. "accounts", "pmo", "qa"). */
    public static function teamMembers(array $teamNameStarts)
    {
        $all = collect();
        foreach ($teamNameStarts as $s) {
            $k = strtolower($s);
            $all = $all->merge(isset(self::PRIVILEGES[$k])
                ? self::usersWith($k)
                : User::with('team')->whereNotNull('team_id')->get()->filter(fn ($u) => self::teamStarts($u, $s)));
        }

        return $all->unique('id')->values();
    }

    /** HR: whoever the Super Admin assigned (default until then: the person with the email hr@intersmart.in). Not a login role. */
    public static function hr(?User $user): bool
    {
        return self::has('hr', $user);
    }

    /** Appreciation: team leads (of any team), HR and PCs (Project Office members) may nominate. */
    public static function appreciationNominator(User $user): bool
    {
        return self::hr($user) || self::pmo($user) || Team::where('team_lead_id', $user->id)->exists();
    }

    /** Appreciation is approved by project managers or HR. */
    public static function appreciationApprover(User $user): bool
    {
        return self::hr($user) || self::pmoManager($user);
    }

    public static function appreciationApprovers()
    {
        return self::pmoManagers()->merge(self::usersWith('hr'))->unique('id');
    }
}
