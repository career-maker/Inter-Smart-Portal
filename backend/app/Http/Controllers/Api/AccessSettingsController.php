<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Team;
use App\Models\User;
use App\Support\Access;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Super Admin only: who holds each module privilege (Accounts, Sales, Project Office, project manager, QA, system administrator, HR ...).
 * A privilege goes to named people and/or whole teams. "Reset" returns it to the built-in default rule.
 */
class AccessSettingsController extends Controller
{
    public function show()
    {
        $saved = Access::settings();
        $privileges = collect(Access::PRIVILEGES)->map(fn ($p, $key) => [
            'key' => $key, 'label' => $p[0], 'description' => $p[1], 'follows' => isset($p[2]) ? Access::PRIVILEGES[$p[2]][0] : null,
            'customised' => isset($saved[$key]),
            'users' => $saved[$key]['users'] ?? Access::usersWith($key)->pluck('id')->all(), // when not customised: who the default rule gives it to
            'teams' => $saved[$key]['teams'] ?? [],
        ])->values();

        return response()->json([
            'privileges' => $privileges,
            'people' => User::where('status', 'Active')->orderBy('first_name')->get(['id', 'first_name', 'last_name', 'email', 'team_id']),
            'teams' => Team::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(Request $request)
    {
        $d = $request->validate([
            'key' => ['required', Rule::in(array_keys(Access::PRIVILEGES))],
            'users' => ['present', 'array', 'max:200'], 'users.*' => ['integer', 'exists:users,id'],
            'teams' => ['present', 'array', 'max:50'], 'teams.*' => ['integer', 'exists:teams,id'],
        ]);
        $this->audit($request, "changed who has the {$d['key']} privilege", Access::settings()[$d['key']] ?? null, ['users' => $d['users'], 'teams' => $d['teams']]);
        Access::saveSetting($d['key'], $d['users'], $d['teams']);

        return response()->json(['message' => 'Saved.']);
    }

    public function reset(Request $request)
    {
        $d = $request->validate(['key' => ['required', Rule::in(array_keys(Access::PRIVILEGES))]]);
        $this->audit($request, "reset the {$d['key']} privilege to its default rule", Access::settings()[$d['key']] ?? null, null);
        Access::resetSetting($d['key']);

        return response()->json(['message' => 'Reset to the default rule.']);
    }

    private function audit(Request $request, string $action, $from, $to): void
    {
        AuditLog::create(['user_id' => $request->user()->id, 'action' => $action, 'model_type' => 'SystemSetting', 'model_id' => 0, 'changes' => json_encode(['from' => $from, 'to' => $to]), 'ip_address' => $request->ip()]);
    }
}
