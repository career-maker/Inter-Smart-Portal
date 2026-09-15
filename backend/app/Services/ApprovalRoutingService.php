<?php

namespace App\Services;

use App\Models\EmailSetting;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class ApprovalRoutingService
{
    const SETTING_KEY = 'approval_routing_rules';

    /**
     * Default role-based rules for Team Leads and other key roles.
     */
    public static function defaultRules(): array
    {
        return [
            'role_rules' => [
                'team_lead' => [
                    'wfh' => [
                        'to_user_id' => null,
                        'to_email' => null,
                        'cc_user_ids' => [],
                        'cc_emails' => ['hr@intersmart.in', 'admin@intersmart.in'],
                        'approval_level' => 'multi', // multi: TO person + Super Admin must approve; single: 1-level
                        'enabled' => true,
                    ],
                    'leave_single_day' => [
                        'to_user_id' => null,
                        'to_email' => null,
                        'cc_user_ids' => [],
                        'cc_emails' => ['hr@intersmart.in', 'admin@intersmart.in'],
                        'approval_level' => 'single', // 1 day casual/sick leave: single level approval
                        'enabled' => true,
                    ],
                    'leave_multi_day' => [
                        'to_user_id' => null,
                        'to_email' => null,
                        'cc_user_ids' => [],
                        'cc_emails' => ['hr@intersmart.in', 'admin@intersmart.in'],
                        'approval_level' => 'multi', // multiple days: multi level approval
                        'enabled' => true,
                    ],
                ],
            ],
            'team_lead_rules' => [
                // List of custom rules per team lead:
                // [ 'id' => '...', 'name' => '...', 'team_lead_ids' => [1, 2], 'wfh' => [...], 'leave_single_day' => [...], 'leave_multi_day' => [...], 'enabled' => true ]
            ],
            'department_rules' => [
                // Kept for backward compatibility
            ],
            'employee_rules' => [
                // List of custom rules per employee(s):
                // [ 'id' => '...', 'name' => '...', 'user_ids' => [1, 2], 'wfh' => [...], 'leave_single_day' => [...], 'leave_multi_day' => [...], 'enabled' => true ]
            ],
        ];
    }

    /**
     * Get saved rules with default fallbacks.
     */
    public static function getRules(): array
    {
        $defaults = self::defaultRules();
        $saved = EmailSetting::getByKey(self::SETTING_KEY, []);

        if (empty($saved) || !is_array($saved)) {
            return $defaults;
        }

        return [
            'role_rules' => array_replace_recursive($defaults['role_rules'], $saved['role_rules'] ?? []),
            'team_lead_rules' => $saved['team_lead_rules'] ?? [],
            'department_rules' => $saved['department_rules'] ?? [],
            'employee_rules' => $saved['employee_rules'] ?? [],
        ];
    }

    /**
     * Save rules.
     */
    public static function saveRules(array $rules): void
    {
        EmailSetting::setByKey(self::SETTING_KEY, $rules);
    }

    /**
     * Resolve approval routing & recipients for an applicant and request type.
     *
     * @param User $applicant
     * @param string $action 'wfh' | 'leave_single_day' | 'leave_multi_day' | 'leave'
     * @param float|int $days Number of days applied
     * @return array
     */
    public static function resolve(User $applicant, string $action, float $days = 1.0): array
    {
        $rules = self::getRules();

        // Normalize action
        $isWfh = ($action === 'wfh');
        $isSingleDay = ($days <= 1.0);
        $leaveCategory = $isSingleDay ? 'leave_single_day' : 'leave_multi_day';
        $targetAction = $isWfh ? 'wfh' : $leaveCategory;

        $isTeamLead = $applicant->hasRole('Team Lead')
            || in_array(strtolower($applicant->role ?? ''), ['team lead', 'lead'], true)
            || Team::where('team_lead_id', $applicant->id)->exists();

        $hasTeam = !empty($applicant->team_id);

        $matchedRule = null;
        $matchedType = null;

        // 1. Employee-level rule (highest priority)
        foreach ($rules['employee_rules'] as $er) {
            if (empty($er['enabled'])) {
                continue;
            }

            // Modern format with user_ids array and 3-card structure
            if (!empty($er['user_ids']) && is_array($er['user_ids']) && in_array((int)$applicant->id, array_map('intval', $er['user_ids']), true)) {
                if (!empty($er[$targetAction]) && !empty($er[$targetAction]['enabled'])) {
                    $matchedRule = $er[$targetAction];
                    $matchedType = 'employee';
                    break;
                }
            }

            // Legacy format with single user_id and request_type
            if (isset($er['user_id']) && (int)$er['user_id'] === (int)$applicant->id) {
                $reqType = $er['request_type'] ?? 'all';
                if ($reqType === 'all' || ($isWfh && $reqType === 'wfh') || (!$isWfh && in_array($reqType, ['leave', $targetAction]))) {
                    $matchedRule = $er;
                    $matchedType = 'employee_legacy';
                    break;
                }
            }
        }

        // 1b. Legacy employee_overrides compatibility from EmailSetting
        if (!$matchedRule) {
            try {
                $legacyOverrides = EmailSetting::getByKey('employee_overrides', []);
                $legacy = collect($legacyOverrides)->first(function ($item) use ($applicant, $isWfh) {
                    if ((int)($item['user_id'] ?? 0) !== (int)$applicant->id || empty($item['enabled'])) {
                        return false;
                    }
                    $act = $item['action'] ?? '';
                    if ($isWfh) {
                        return $act === 'wfh_application';
                    }
                    return in_array($act, ['leave_application', 'leave_cl_short_notice']);
                });

                if ($legacy) {
                    $matchedRule = [
                        'to_user_id' => $legacy['approver_user_id'] ?? null,
                        'to_email' => $legacy['custom_to'] ?? null,
                        'to_user_id_2' => $legacy['approver_user_id_2'] ?? null,
                        'to_email_2' => $legacy['custom_to_2'] ?? null,
                        'cc_user_ids' => [],
                        'cc_emails' => $legacy['custom_cc'] ?? [],
                        'approval_level' => !empty($legacy['approver_user_id_2']) ? 'multi' : 'single',
                    ];
                    $matchedType = 'employee_legacy';
                }
            } catch (\Throwable $e) {}
        }

        // 2. Department / Team-level rule (legacy fallback)
        if (!$matchedRule && $hasTeam) {
            foreach ($rules['department_rules'] as $dr) {
                if (!empty($dr['enabled']) && (int)($dr['team_id'] ?? 0) === (int)$applicant->team_id) {
                    $reqType = $dr['request_type'] ?? 'all';
                    if ($reqType === 'all' || ($isWfh && $reqType === 'wfh') || (!$isWfh && in_array($reqType, ['leave', $targetAction]))) {
                        $matchedRule = $dr;
                        $matchedType = 'department';
                        break;
                    }
                }
            }
        }

        // 3. Team Lead-level rules
        if (!$matchedRule && $isTeamLead) {
            // 3a. Specific Team Lead rule by team_lead_ids
            foreach ($rules['team_lead_rules'] ?? [] as $tlRule) {
                if (!empty($tlRule['enabled']) && !empty($tlRule['team_lead_ids']) && is_array($tlRule['team_lead_ids'])) {
                    if (in_array((int)$applicant->id, array_map('intval', $tlRule['team_lead_ids']), true)) {
                        if (!empty($tlRule[$targetAction]) && !empty($tlRule[$targetAction]['enabled'])) {
                            $matchedRule = $tlRule[$targetAction];
                            $matchedType = 'role_team_lead_specific';
                            break;
                        }
                    }
                }
            }

            // 3b. Fallback to default role rule for team_lead
            if (!$matchedRule) {
                $tlRules = $rules['role_rules']['team_lead'] ?? [];
                if (!empty($tlRules[$targetAction]) && !empty($tlRules[$targetAction]['enabled'])) {
                    $matchedRule = $tlRules[$targetAction];
                    $matchedType = 'role_team_lead_default';
                }
            }
        }

        // 4. General employee without team -> Direct to Super Admin
        if (!$matchedRule && !$hasTeam) {
            $matchedType = 'general_no_team';
            return [
                'approval_level' => 'single',
                'direct_admin' => true,
                'approver_user_ids' => [],
                'to_emails' => ['admin@intersmart.in'],
                'cc_emails' => ['hr@intersmart.in'],
                'matched_type' => $matchedType,
            ];
        }

        // 5. Build DTO from matched rule or default
        if ($matchedRule) {
            $approvalLevel = $matchedRule['approval_level'] ?? ($isWfh || !$isSingleDay ? 'multi' : 'single');
            $approverUserIds = [];

            if (!empty($matchedRule['to_user_id'])) {
                $approverUserIds[] = (int)$matchedRule['to_user_id'];
            }
            if (!empty($matchedRule['to_user_id_2'])) {
                $approverUserIds[] = (int)$matchedRule['to_user_id_2'];
            }

            // Resolve TO emails
            $toEmails = [];
            if (!empty($matchedRule['to_email']) && filter_var(trim($matchedRule['to_email']), FILTER_VALIDATE_EMAIL)) {
                $toEmails[] = trim($matchedRule['to_email']);
            }
            if ($approvalLevel === 'multi') {
                if (!empty($matchedRule['to_email_2']) && filter_var(trim($matchedRule['to_email_2']), FILTER_VALIDATE_EMAIL)) {
                    $toEmails[] = trim($matchedRule['to_email_2']);
                } elseif (empty($matchedRule['to_user_id_2'])) {
                    // Default second approver for multi-level routing is Super Admin
                    $toEmails[] = 'admin@intersmart.in';
                }
            }
            if (!empty($approverUserIds)) {
                $toUsers = User::whereIn('id', $approverUserIds)->pluck('email')->filter()->all();
                foreach ($toUsers as $em) {
                    if (filter_var(trim($em), FILTER_VALIDATE_EMAIL)) {
                        $toEmails[] = trim($em);
                    }
                }
            }

            // Fallback TO email if none resolved
            if (empty($toEmails)) {
                $toEmails[] = 'admin@intersmart.in';
            }

            // Resolve CC emails
            $ccEmails = [];
            if (!empty($matchedRule['cc_emails']) && is_array($matchedRule['cc_emails'])) {
                foreach ($matchedRule['cc_emails'] as $cc) {
                    $trim = trim($cc);
                    if (!empty($trim) && filter_var($trim, FILTER_VALIDATE_EMAIL)) {
                        $ccEmails[] = $trim;
                    }
                }
            }
            if (!empty($matchedRule['cc_user_ids']) && is_array($matchedRule['cc_user_ids'])) {
                $ccUsers = User::whereIn('id', $matchedRule['cc_user_ids'])->pluck('email')->filter()->all();
                foreach ($ccUsers as $em) {
                    if (filter_var(trim($em), FILTER_VALIDATE_EMAIL)) {
                        $ccEmails[] = trim($em);
                    }
                }
            }

            // If rule has no approver user ID assigned, it goes directly to Super Admin
            $directAdmin = empty($approverUserIds) && empty($matchedRule['to_email']);

            return [
                'approval_level' => $approvalLevel,
                'direct_admin' => $directAdmin,
                'approver_user_ids' => array_values(array_unique($approverUserIds)),
                'to_emails' => array_values(array_unique($toEmails)),
                'cc_emails' => array_values(array_unique($ccEmails)),
                'matched_type' => $matchedType,
            ];
        }

        // Standard employee in team: Team Lead approval
        $teamLead = $applicant->teamLead();
        $teamLeadUserIds = $teamLead ? [$teamLead->id] : [];
        $toEmails = ($teamLead && filter_var($teamLead->email, FILTER_VALIDATE_EMAIL)) ? [trim($teamLead->email)] : ['admin@intersmart.in'];

        return [
            'approval_level' => ($isWfh || !$isSingleDay) ? 'multi' : 'single',
            'direct_admin' => empty($teamLeadUserIds),
            'approver_user_ids' => $teamLeadUserIds,
            'to_emails' => $toEmails,
            'cc_emails' => ['hr@intersmart.in', 'admin@intersmart.in'],
            'matched_type' => 'default_team_lead',
        ];
    }

    /**
     * Helper to check if a given user is an authorized custom/role/department approver for an applicant.
     */
    public static function isUserAuthorizedApprover(User $approver, User $applicant, string $action, float $days = 1.0): bool
    {
        if ($approver->hasRole('Super Admin') || $approver->hasRole('HR')) {
            return true;
        }

        $resolution = self::resolve($applicant, $action, $days);
        return in_array((int)$approver->id, $resolution['approver_user_ids'], true);
    }

    /**
     * Get all applicant IDs that have been delegated to a specific approver.
     */
    public static function getDelegatedApplicantIdsForApprover(User $approver): array
    {
        $rules = self::getRules();
        $approverId = (int)$approver->id;
        $applicantIds = [];

        // 1. From employee rules
        foreach ($rules['employee_rules'] as $er) {
            if (empty($er['enabled'])) {
                continue;
            }
            $targetUserIds = !empty($er['user_ids']) && is_array($er['user_ids'])
                ? array_map('intval', $er['user_ids'])
                : (!empty($er['user_id']) ? [(int)$er['user_id']] : []);
            $targetUserIds = array_filter($targetUserIds);

            $isApproverInCards = false;
            foreach (['wfh', 'leave_single_day', 'leave_multi_day'] as $cardKey) {
                if (!empty($er[$cardKey]['enabled']) && ((int)($er[$cardKey]['to_user_id'] ?? 0) === $approverId || (int)($er[$cardKey]['to_user_id_2'] ?? 0) === $approverId)) {
                    $isApproverInCards = true;
                    break;
                }
            }

            if ($isApproverInCards || (int)($er['to_user_id'] ?? 0) === $approverId || (int)($er['to_user_id_2'] ?? 0) === $approverId) {
                $applicantIds = array_merge($applicantIds, $targetUserIds);
            }
        }

        // 2. From team lead rules
        foreach ($rules['team_lead_rules'] ?? [] as $tlRule) {
            if (empty($tlRule['enabled'])) {
                continue;
            }
            $tlIds = !empty($tlRule['team_lead_ids']) && is_array($tlRule['team_lead_ids'])
                ? array_map('intval', $tlRule['team_lead_ids'])
                : [];
            $tlIds = array_filter($tlIds);

            $isApproverInCards = false;
            foreach (['wfh', 'leave_single_day', 'leave_multi_day'] as $cardKey) {
                if (!empty($tlRule[$cardKey]['enabled']) && ((int)($tlRule[$cardKey]['to_user_id'] ?? 0) === $approverId || (int)($tlRule[$cardKey]['to_user_id_2'] ?? 0) === $approverId)) {
                    $isApproverInCards = true;
                    break;
                }
            }
            if ($isApproverInCards) {
                $applicantIds = array_merge($applicantIds, $tlIds);
            }
        }

        // 3. From department rules (legacy)
        foreach ($rules['department_rules'] as $dr) {
            if (!empty($dr['enabled']) && !empty($dr['team_id'])) {
                if ((int)($dr['to_user_id'] ?? 0) === $approverId || (int)($dr['to_user_id_2'] ?? 0) === $approverId) {
                    $teamUserIds = User::where('team_id', $dr['team_id'])->pluck('id')->all();
                    $applicantIds = array_merge($applicantIds, $teamUserIds);
                }
            }
        }

        // 4. From default role rules (e.g. if approver is set as TO person for Team Leads)
        foreach (($rules['role_rules'] ?? []) as $roleKey => $actionRules) {
            if (is_array($actionRules)) {
                foreach ($actionRules as $rule) {
                    if (!empty($rule['enabled']) && ((int)($rule['to_user_id'] ?? 0) === $approverId || (int)($rule['to_user_id_2'] ?? 0) === $approverId)) {
                        if ($roleKey === 'team_lead') {
                            $tlUserIds = Team::whereNotNull('team_lead_id')->pluck('team_lead_id')->all();
                            $spatieTlIds = User::role('Team Lead')->pluck('id')->all();
                            $applicantIds = array_merge($applicantIds, $tlUserIds, $spatieTlIds);
                        } else {
                            $roleUserIds = User::role($roleKey)->pluck('id')->all();
                            $applicantIds = array_merge($applicantIds, $roleUserIds);
                        }
                    }
                }
            }
        }

        // 4. Legacy employee overrides
        try {
            $legacy = EmailSetting::getByKey('employee_overrides', []);
            foreach ($legacy as $item) {
                if (!empty($item['enabled']) && !empty($item['user_id'])) {
                    if ((int)($item['approver_user_id'] ?? 0) === $approverId || (int)($item['approver_user_id_2'] ?? 0) === $approverId) {
                        $applicantIds[] = (int)$item['user_id'];
                    }
                }
            }
        } catch (\Throwable $e) {}

        return array_values(array_unique(array_filter($applicantIds)));
    }

    /**
     * Check if a user is an authorized approver for any employee, team, or role.
     */
    public static function isUserAnyApprover(User $user): bool
    {
        if ($user->hasRole('Super Admin') || $user->hasRole('HR')) {
            return true;
        }

        $isTeamLead = $user->hasRole('Team Lead')
            || in_array(strtolower($user->role ?? ''), ['team lead', 'lead'], true)
            || Team::where('team_lead_id', $user->id)->exists();

        if ($isTeamLead) {
            return true;
        }

        $delegated = self::getDelegatedApplicantIdsForApprover($user);
        return !empty($delegated);
    }
}
