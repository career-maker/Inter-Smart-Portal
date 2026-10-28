<?php

namespace App\Support;

use App\Models\User;

/**
 * Where a module notification opens. The old code sent every Accounts, Sales, Project Office and department-work notification to the general
 * Project Management project list (/project-management/projects). Now the page depends on the event and on who receives it:
 * a salesperson goes to Sales, Accounts to Accounts, the Project Office to the Project Office project, department staff to their work view.
 */
class NotificationLink
{
    public static function for(string $event, ?int $projectId, $user): string
    {
        $pmo = $projectId ? "/pmo/projects/{$projectId}" : '/pmo';
        $work = $projectId ? "/work/projects/{$projectId}" : '/work';
        $salesOnly = $user instanceof User && Access::sales($user) && ! Access::pmo($user);

        if (str_starts_with($event, 'appreciation.')) {
            return '/appreciation';
        }
        if (str_starts_with($event, 'meeting.')) {
            return '/meetings';
        }

        return match (true) {
            $event === 'amc_expiring' => '/sales/completed',
            $event === 'out_of_scope_sales_action' => '/sales/out-of-scope',
            in_array($event, ['out_of_scope_requested', 'out_of_scope_sales_reply'], true) => '/pmo/approvals',
            in_array($event, ['out_of_scope_approved', 'out_of_scope_rejected'], true) => $salesOnly ? '/sales/out-of-scope' : '/pmo/approvals',
            $event === 'payment_requested' => '/accounts',
            $event === 'server_requested' => '/work/go-live',
            $event === 'qa_ready' => '/work/qa',
            str_starts_with($event, 'qa_'), str_starts_with($event, 'sprint_'), str_starts_with($event, 'item_'), str_starts_with($event, 'page_'),
            str_starts_with($event, 'change_'), str_starts_with($event, 'effort_') => $work,
            default => self::byRecipient($user, $pmo, $work),
        };
    }

    /** Project, payment and budget events: the page of the person's own module. */
    private static function byRecipient($user, string $pmo, string $work): string
    {
        if (! $user instanceof User) {
            return $work;
        }
        if (Access::pmo($user)) {
            return $pmo;
        }
        if (Access::sales($user)) {
            return '/sales/projects';
        }
        if (Access::accounts($user)) {
            return '/accounts';
        }

        return $work;
    }
}
