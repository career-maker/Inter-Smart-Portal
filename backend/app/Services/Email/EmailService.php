<?php

namespace App\Services\Email;

use App\Models\LeaveRequest;
use App\Models\WfhRequest;
use App\Models\TARequest;
use App\Models\EmailSetting;
use App\Models\User;
use App\Mail\LeaveRequestMail;
use App\Mail\WfhRequestMail;
use App\Mail\RecognitionMail;
use App\Mail\TARequestMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;

class EmailService
{
    /**
     * Apply active SMTP configuration from database dynamically.
     */
    public static function applySmtpConfig(): void
    {
        try {
            $smtp = EmailSetting::getByKey('smtp_config', EmailSetting::defaultSmtp());
            if (!empty($smtp['host']) && !empty($smtp['username']) && !empty($smtp['password'])) {
                Config::set('mail.mailers.smtp', [
                    'transport'  => 'smtp',
                    'host'       => $smtp['host'] ?? 'smtp.gmail.com',
                    'port'       => (int)($smtp['port'] ?? 587),
                    'encryption' => ($smtp['encryption'] ?? 'tls') === 'none' ? null : ($smtp['encryption'] ?? 'tls'),
                    'username'   => $smtp['username'],
                    'password'   => $smtp['password'],
                    'timeout'    => 15,
                ]);

                $fromAddr = $smtp['from_address'] ?? $smtp['username'];
                $fromName = $smtp['from_name'] ?? 'Inter Smart Portal';

                Config::set('mail.from', [
                    'address' => $fromAddr,
                    'name'    => $fromName,
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning("Failed to apply dynamic SMTP config: " . $e->getMessage());
        }
    }

    /**
     * Resolve TO, CC, BCC recipients for any action dynamically.
     */
    public static function resolveRecipients(string $action, $user, array $extraContext = []): array
    {
        $recipients = [
            'to'  => [],
            'cc'  => [],
            'bcc' => [],
        ];

        // 1. Check for Employee-Specific Override first
        try {
            $overrides = EmailSetting::getByKey('employee_overrides', []);
            $activeOverride = collect($overrides)->first(function ($item) use ($user, $action) {
                return (int)($item['user_id'] ?? 0) === (int)$user->id
                    && ($item['action'] ?? '') === $action
                    && ($item['enabled'] ?? true);
            });

            if ($activeOverride) {
                Log::info("🎯 Active employee email override found for User ID {$user->id} on action '{$action}'");
                if (!empty($activeOverride['custom_to'])) {
                    $recipients['to'][] = trim($activeOverride['custom_to']);
                }
                if (!empty($activeOverride['custom_cc']) && is_array($activeOverride['custom_cc'])) {
                    foreach ($activeOverride['custom_cc'] as $cc) {
                        if (!empty($cc)) $recipients['cc'][] = trim($cc);
                    }
                }

                // If custom TO was set, return resolved override (plus applicant copy if needed)
                if (!empty($recipients['to'])) {
                    if (!empty($user->email)) {
                        $recipients['cc'][] = $user->email;
                    }
                    $recipients['to'] = array_values(array_unique(array_filter($recipients['to'])));
                    $recipients['cc'] = array_values(array_unique(array_filter($recipients['cc'])));
                    return $recipients;
                }
            }
        } catch (\Throwable $e) {
            Log::warning("Failed checking employee overrides: " . $e->getMessage());
        }

        // 2. Resolve Global Routing Rules
        $routingRules = EmailSetting::getByKey('global_routing', EmailSetting::defaultRouting());
        $rule = $routingRules[$action] ?? ($routingRules['leave_application'] ?? []);

        // Resolve Team Lead
        $teamLeadEmail = null;
        if ($user->team_id) {
            $team = \App\Models\Team::find($user->team_id);
            $tl = $team?->teamLead;
            if ($tl && $tl->email && $tl->id !== $user->id) {
                $teamLeadEmail = $tl->email;
            }
        }

        // Apply TO routing
        if (!empty($rule['notify_tl']) && $teamLeadEmail) {
            $recipients['to'][] = $teamLeadEmail;
        }

        if (!empty($rule['custom_to']) && is_array($rule['custom_to'])) {
            foreach ($rule['custom_to'] as $toEmail) {
                if (!empty($toEmail)) $recipients['to'][] = trim($toEmail);
            }
        }

        // Fallback to admin if no TO found
        if (empty($recipients['to'])) {
            $recipients['to'][] = 'admin@intersmart.in';
        }

        // Apply CC routing
        if (!empty($rule['custom_cc']) && is_array($rule['custom_cc'])) {
            foreach ($rule['custom_cc'] as $ccEmail) {
                if (!empty($ccEmail)) $recipients['cc'][] = trim($ccEmail);
            }
        }

        if (!empty($rule['notify_hr'])) {
            $recipients['cc'][] = 'hr@intersmart.in';
        }
        if (!empty($rule['notify_admin'])) {
            $recipients['cc'][] = 'admin@intersmart.in';
        }

        // Applicant copy
        if (!empty($rule['cc_applicant']) && !empty($user->email)) {
            $recipients['cc'][] = $user->email;
        }

        $recipients['to'] = array_values(array_unique(array_filter($recipients['to'])));
        $recipients['cc'] = array_values(array_unique(array_filter($recipients['cc'])));

        return $recipients;
    }

    /**
     * Send email notification for a leave request
     */
    public static function sendLeaveRequestEmail(LeaveRequest $leaveRequest): void
    {
        try {
            self::applySmtpConfig();
            $leaveRequest->load(['user', 'leaveType']);

            $isCasual = ($leaveRequest->leaveType?->name === 'Casual Leave') || ($leaveRequest->paid_casual_leave > 0);
            $policy = \App\Models\LeavePolicySetting::current();
            $noticeDays = isset($policy->cl_advance_notice_days) ? (int)$policy->cl_advance_notice_days : 3;

            $today = \Carbon\Carbon::today('Asia/Kolkata');
            $start = \Carbon\Carbon::parse($leaveRequest->start_date);
            $isShortNotice = $isCasual && ($start->lt($today->copy()->addDays($noticeDays)));

            $actionKey = $isShortNotice ? 'leave_cl_short_notice' : 'leave_application';

            $emailData = self::prepareLeaveEmailData($leaveRequest);
            $recipients = self::resolveRecipients($actionKey, $leaveRequest->user, ['leave_request' => $leaveRequest]);

            Log::info("📧 Leave [{$actionKey}] Recipients: TO=" . json_encode($recipients['to']) . " CC=" . json_encode($recipients['cc']));

            foreach ($recipients['to'] as $email) {
                try {
                    $ccList = array_values(array_filter($recipients['cc'], fn($cc) => strtolower($cc) !== strtolower($email)));
                    $mail = Mail::to($email);
                    if (!empty($ccList)) {
                        $mail->cc($ccList);
                    }
                    $mail->send(new LeaveRequestMail($emailData, $leaveRequest, $ccList));
                    Log::info("✅ Leave Email sent to {$email}");
                } catch (\Throwable $e) {
                    Log::error("❌ Failed to send leave email to {$email}: " . $e->getMessage());
                }
            }
        } catch (\Throwable $e) {
            Log::error("💥 Critical error in sendLeaveRequestEmail: " . $e->getMessage());
        }
    }

    /**
     * Send email notification for a WFH request
     */
    public static function sendWfhRequestEmail(WfhRequest $wfhRequest): void
    {
        try {
            self::applySmtpConfig();
            $wfhRequest->load(['user']);

            $emailData = self::prepareWfhEmailData($wfhRequest);
            $recipients = self::resolveRecipients('wfh_application', $wfhRequest->user, ['wfh_request' => $wfhRequest]);

            Log::info("📧 WFH Recipients: TO=" . json_encode($recipients['to']) . " CC=" . json_encode($recipients['cc']));

            foreach ($recipients['to'] as $email) {
                try {
                    $ccList = array_values(array_filter($recipients['cc'], fn($cc) => strtolower($cc) !== strtolower($email)));
                    $mail = Mail::to($email);
                    if (!empty($ccList)) {
                        $mail->cc($ccList);
                    }
                    $mail->send(new WfhRequestMail($emailData, $wfhRequest, $ccList));
                    Log::info("✅ WFH Email sent to {$email}");
                } catch (\Throwable $e) {
                    Log::error("❌ Failed to send WFH email to {$email}: " . $e->getMessage());
                }
            }
        } catch (\Throwable $e) {
            Log::error("💥 Critical error in sendWfhRequestEmail: " . $e->getMessage());
        }
    }

    /**
     * Send recognition/award email notification with configurable CC
     */
    public static function sendRecognitionEmail($user, $recognition): void
    {
        try {
            self::applySmtpConfig();

            if (!$user->email) {
                Log::warning("❌ No email for user ID {$user->id}");
                return;
            }

            $user->loadMissing('team');
            $recognition->loadMissing('creator');

            $startDate = $recognition->start_date;
            if (is_string($startDate)) $startDate = \Carbon\Carbon::parse($startDate);
            $startDateFormatted = $startDate ? $startDate->format('d M Y') : 'N/A';

            $endDate = $recognition->end_date;
            if (is_string($endDate)) $endDate = \Carbon\Carbon::parse($endDate);
            $endDateFormatted = $endDate ? $endDate->format('d M Y') : 'N/A';

            $creator = $recognition->creator;
            $awardedBy = $creator ? "{$creator->first_name} {$creator->last_name}" : 'Management';

            $emailData = [
                'employee_name' => "{$user->first_name} {$user->last_name}",
                'employee_id'   => $user->employee_code ?? 'N/A',
                'department'    => $user->team?->name ?? 'N/A',
                'designation'   => $user->designation ?? 'N/A',
                'title'         => $recognition->title,
                'description'   => $recognition->description,
                'icon'          => $recognition->icon ?? '⭐',
                'start_date'    => $startDateFormatted,
                'end_date'      => $endDateFormatted,
                'awarded_by'    => $awardedBy,
            ];

            // Resolve custom CCs for awards from routing matrix
            $recipients = self::resolveRecipients('recognition_award', $user, ['recognition' => $recognition]);
            $ccList = array_values(array_filter($recipients['cc'], fn($cc) => strtolower($cc) !== strtolower($user->email)));

            $mail = Mail::to($user->email);
            if (!empty($ccList)) {
                $mail->cc($ccList);
            }

            $mail->send(new RecognitionMail($emailData));
            Log::info("✅ Recognition email sent to {$user->email} (CC: " . json_encode($ccList) . ")");
        } catch (\Throwable $e) {
            Log::error("💥 Critical error in sendRecognitionEmail: " . $e->getMessage());
        }
    }

    /**
     * Send TA request email notification
     */
    public static function sendTARequestEmail(TARequest $taRequest, array $emailData): void
    {
        try {
            self::applySmtpConfig();
            $taRequest->loadMissing('user');

            $recipients = self::resolveRecipients('ta_claim', $taRequest->user, ['ta_request' => $taRequest]);
            $toEmails = !empty($recipients['to']) ? $recipients['to'] : ['HR@intersmart.in', 'Ameesha@intersmart.in'];
            $ccEmails = $recipients['cc'] ?? [];

            foreach ($toEmails as $email) {
                try {
                    $ccList = array_values(array_filter($ccEmails, fn($cc) => strtolower($cc) !== strtolower($email)));
                    $mail = Mail::to($email);
                    if (!empty($ccList)) {
                        $mail->cc($ccList);
                    }
                    $mail->send(new TARequestMail($taRequest, $emailData));
                    Log::info("✅ TA Claim Email sent to {$email}");
                } catch (\Throwable $e) {
                    Log::error("❌ Failed to send TA email to {$email}: " . $e->getMessage());
                }
            }
        } catch (\Throwable $e) {
            Log::error("💥 Critical error in sendTARequestEmail: " . $e->getMessage());
        }
    }

    /**
     * Prepare leave email data
     */
    private static function prepareLeaveEmailData(LeaveRequest $leaveRequest): array
    {
        $user = $leaveRequest->user;
        $leaveType = $leaveRequest->leaveType;
        $startDate = $leaveRequest->start_date;
        $endDate = $leaveRequest->end_date;
        $isSingleDay = ($startDate === $endDate);

        return [
            'employee_name'    => "{$user->first_name} {$user->last_name}",
            'employee_id'      => $user->employee_code,
            'department'       => $user->team?->name ?? 'N/A',
            'designation'      => $user->designation ?? 'N/A',
            'leave_type'       => $leaveType->name ?? 'Leave',
            'start_date'       => $startDate,
            'end_date'         => $endDate,
            'is_single_day'    => $isSingleDay,
            'days'             => $leaveRequest->days,
            'reason'           => $leaveRequest->reason,
            'applied_date'     => $leaveRequest->created_at->format('d M Y'),
            'reference_number' => "LR-{$leaveRequest->id}",
            'request_id'       => $leaveRequest->id,
            'portal_url'       => config('app.frontend_url', 'https://www.workplace.intersmart.in'),
            'approvals_url'    => config('app.frontend_url', 'https://www.workplace.intersmart.in') . '/leaves/approvals'
        ];
    }

    /**
     * Prepare WFH email data
     */
    private static function prepareWfhEmailData(WfhRequest $wfhRequest): array
    {
        $user = $wfhRequest->user;
        $startDate = $wfhRequest->start_date;
        $endDate = $wfhRequest->end_date;
        $isSingleDay = ($startDate === $endDate);

        return [
            'employee_name'    => "{$user->first_name} {$user->last_name}",
            'employee_id'      => $user->employee_code,
            'department'       => $user->team?->name ?? 'N/A',
            'designation'      => $user->designation ?? 'N/A',
            'duration_type'    => $wfhRequest->duration_type,
            'start_date'       => $startDate,
            'end_date'         => $endDate,
            'is_single_day'    => $isSingleDay,
            'reason'           => $wfhRequest->reason,
            'applied_date'     => $wfhRequest->created_at->format('d M Y'),
            'reference_number' => "WFH-{$wfhRequest->id}",
            'request_id'       => $wfhRequest->id,
            'portal_url'       => config('app.frontend_url', 'https://www.workplace.intersmart.in'),
            'approvals_url'    => config('app.frontend_url', 'https://www.workplace.intersmart.in') . '/wfh/approvals'
        ];
    }
}
