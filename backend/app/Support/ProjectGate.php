<?php

namespace App\Support;

use App\Models\Project;
use App\Models\ProjectBudgetAllocation;
use App\Models\ProjectFinance;
use App\Models\ProjectOverride;
use App\Models\ProjectPayment;

/**
 * Which tabs of a project are open (the sheet's payment lock and budget lock).
 *  - Payment lock: tabs open once the advance is approved, or the Super Admin overrode payment.
 *  - Budget lock: working tabs (UI, UX, Dev, QA) also need a department budget, or a PMO budget override.
 * Tabs marked ready=false are shown but built in a later phase.
 */
class ProjectGate
{
    private const TABS = [
        // key => [label, needs_payment, needs_budget, ready]
        'overview' => ['Overview', false, false, true],
        'business_analysis' => ['Business analysis', true, false, true],
        'resources' => ['Resources', true, false, true],
        'ui' => ['UI', true, true, true],
        'ux' => ['UX', true, true, false],
        'dev' => ['Dev', true, true, false],
        'qa' => ['QA', true, true, false],
        'bugs' => ['Bugs & changes', true, false, false],
        'budget' => ['Budget', false, false, true],
        'system_admin' => ['System admin', true, false, false],
    ];

    public static function state(Project $project): array
    {
        $finance = ProjectFinance::where('project_id', $project->id)->first();
        $payments = ProjectPayment::where('project_id', $project->id)->get();
        $pay = ProjectPaymentState::for($finance, $payments);
        $overrides = ProjectOverride::where('project_id', $project->id)->get()->keyBy('type');
        $allocated = (float) ProjectBudgetAllocation::where('project_id', $project->id)->sum('amount');

        $paymentOpen = in_array($pay['state'], [ProjectPaymentState::PENDING, ProjectPaymentState::PAID], true) || $overrides->has('payment');
        $budgetOpen = $allocated > 0 || $overrides->has('budget');

        return [
            'payment' => $pay + ['open' => $paymentOpen, 'overridden' => $overrides->has('payment')],
            'budget' => ['allocated' => $allocated, 'open' => $budgetOpen, 'overridden' => $overrides->has('budget')],
            'tabs' => collect(self::TABS)->map(function ($t, $key) use ($paymentOpen, $budgetOpen) {
                [$label, $needsPayment, $needsBudget, $ready] = $t;
                $reason = null;
                if ($needsPayment && ! $paymentOpen) {
                    $reason = 'Locked until the advance payment is approved by Accounts (or the Super Admin overrides).';
                } elseif ($needsBudget && ! $budgetOpen) {
                    $reason = 'Locked until a department budget is allocated (or the PMO overrides).';
                }

                return ['key' => $key, 'label' => $label, 'enabled' => $reason === null, 'locked_reason' => $reason, 'ready' => $ready];
            })->values(),
        ];
    }
}
