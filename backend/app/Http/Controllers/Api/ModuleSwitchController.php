<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Support\Feature;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Super Admin only: switch each module on or off for everyone. Off = its screens and API answer "not found" (data is kept). */
class ModuleSwitchController extends Controller
{
    public const MODULES = [
        'accounts' => ['Accounts', 'Payments, budget increases, sales targets, AMC list'],
        'sales' => ['Sales', 'Leads, inbox, projects, completed projects and AMC, out-of-scope reply'],
        'pmo' => ['Project Office', 'Projects, budgets, hold, approvals, out-of-budget list, tracker'],
        'workflow' => ['Department work', 'UI pages, UX/Dev sprints, QA, corrections and changes, inbox, team, go-live'],
        'appreciation' => ['Appreciation', 'Nominate and approve appreciation'],
        'meetings' => ['Meetings', 'Client and internal meetings with calendar invites'],
        'customer_feedback' => ['Customer feedback', 'Feedback notes from customers'],
        'hr_performance' => ['HR performance figures', 'Per-person performance figures'],
    ];

    public function show()
    {
        return response()->json(['modules' => collect(self::MODULES)->map(fn ($m, $k) => ['key' => $k, 'label' => $m[0], 'description' => $m[1], 'enabled' => Feature::enabled($k)])->values()]);
    }

    public function update(Request $request)
    {
        $d = $request->validate(['key' => ['required', Rule::in(array_keys(self::MODULES))], 'enabled' => ['required', 'boolean']]);
        Feature::set($d['key'], (bool) $d['enabled']);
        AuditLog::create(['user_id' => $request->user()->id, 'action' => ($d['enabled'] ? 'switched on' : 'switched off') . " the {$d['key']} module", 'model_type' => 'SystemSetting', 'model_id' => 0, 'changes' => json_encode($d), 'ip_address' => $request->ip()]);

        return response()->json(['message' => 'Saved.']);
    }
}
