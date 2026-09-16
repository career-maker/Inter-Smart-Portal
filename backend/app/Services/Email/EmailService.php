<?php

namespace App\Services\Email;

use App\Models\LeaveRequest;
use App\Models\WfhRequest;
use App\Models\TARequest;
use App\Models\EmailSetting;
use App\Models\User;
use App\Models\CommunityPost;
use App\Mail\LeaveRequestMail;
use App\Mail\WfhRequestMail;
use App\Mail\RecognitionMail;
use App\Mail\TARequestMail;
use App\Mail\TAApprovedMail;
use App\Mail\CommunityBroadcastMail;
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
                Config::set('mail.default', 'smtp');
                Config::set('mail.mailers.smtp', [
                    'transport'  => 'smtp',
                    'host'       => $smtp['host'] ?? 'smtp.gmail.com',
                    'port'       => (int)($smtp['port'] ?? 587),
                    'encryption' => ($smtp['encryption'] ?? 'tls') === 'none' ? null : ($smtp['encryption'] ?? 'tls'),
                    'username'   => !empty($smtp['username']) ? $smtp['username'] : env('MAIL_USERNAME'),
                    'password'   => !empty($smtp['password']) ? $smtp['password'] : env('MAIL_PASSWORD'),
                    'timeout'    => 15,
                ]);

                $fromAddr = !empty($smtp['from_address']) ? $smtp['from_address'] : env('MAIL_FROM_ADDRESS', env('MAIL_USERNAME'));
                $fromName = !empty($smtp['from_name']) ? $smtp['from_name'] : env('MAIL_FROM_NAME', 'Inter Smart Portal');

                Config::set('mail.from', [
                    'address' => $fromAddr,
                    'name'    => $fromName,
                ]);
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

        // 0. Check ApprovalRoutingService (Role rules like Team Lead, Department rules, Employee rules, General without team)
        try {
            if (in_array($action, ['wfh_application', 'leave_application', 'leave_cl_short_notice'])) {
                $isWfh = ($action === 'wfh_application');
                $days = 1.0;
                if ($isWfh && !empty($extraContext['wfh_request'])) {
                    $wfhReq = $extraContext['wfh_request'];
                    if (!empty($wfhReq->start_date) && !empty($wfhReq->end_date)) {
                        $diff = \Carbon\Carbon::parse($wfhReq->start_date)->diffInDays(\Carbon\Carbon::parse($wfhReq->end_date)) + 1;
                        $days = max(1.0, (float)$diff);
                    }
                } elseif (!empty($extraContext['leave_request'])) {
                    $days = floatval($extraContext['leave_request']->days ?? 1.0);
                }

                $routing = \App\Services\ApprovalRoutingService::resolve($user, $isWfh ? 'wfh' : 'leave', $days);

                if (!empty($routing['to_emails']) && (str_starts_with($routing['matched_type'] ?? '', 'role_team_lead') || in_array($routing['matched_type'], ['role_employee_default', 'department', 'employee', 'employee_legacy', 'general_no_team'], true))) {
                    $recipients['to'] = $routing['to_emails'];
                    $recipients['cc'] = $routing['cc_emails'];

                    if (!empty($user->email) && filter_var($user->email, FILTER_VALIDATE_EMAIL)) {
                        $recipients['cc'][] = trim($user->email);
                    }

                    $recipients['to'] = array_values(array_unique(array_filter($recipients['to'])));
                    $recipients['cc'] = array_values(array_unique(array_filter($recipients['cc'])));

                    Log::info("🎯 Resolved recipients from ApprovalRoutingService for action {$action} (type: {$routing['matched_type']})");
                    return $recipients;
                }
            }
        } catch (\Throwable $e) {
            Log::warning("ApprovalRoutingService resolution failed: " . $e->getMessage());
        }

        $matchedOverride = null;

        // 1. Check for Employee-Specific Override first
        try {
            $overrides = EmailSetting::getByKey('employee_overrides', []);
            
            // Look for exact match by user_id and action
            $matchedOverride = collect($overrides)->first(function ($item) use ($user, $action) {
                return (int)($item['user_id'] ?? 0) === (int)$user->id
                    && ($item['action'] ?? '') === $action
                    && ($item['enabled'] ?? true);
            });

            // If action is short-notice casual leave and no specific short-notice override exists,
            // fallback to the general leave_application override for this employee
            if (!$matchedOverride && $action === 'leave_cl_short_notice') {
                $matchedOverride = collect($overrides)->first(function ($item) use ($user) {
                    return (int)($item['user_id'] ?? 0) === (int)$user->id
                        && ($item['action'] ?? '') === 'leave_application'
                        && ($item['enabled'] ?? true);
                });
            }

            if ($matchedOverride) {
                Log::info("🎯 Active employee email override matched for User ID {$user->id} on action '{$action}'");
                if (!empty($matchedOverride['custom_to'])) {
                    $customTo = trim($matchedOverride['custom_to']);
                    if (filter_var($customTo, FILTER_VALIDATE_EMAIL)) {
                        $recipients['to'][] = $customTo;
                    } else {
                        Log::warning("⚠️ Custom TO email '{$customTo}' is invalid RFC email, skipping.");
                    }
                }

                if (!empty($matchedOverride['custom_to_2'])) {
                    $customTo2 = trim($matchedOverride['custom_to_2']);
                    if (filter_var($customTo2, FILTER_VALIDATE_EMAIL)) {
                        $recipients['to'][] = $customTo2;
                    } else {
                        Log::warning("⚠️ Custom TO 2 email '{$customTo2}' is invalid RFC email, skipping.");
                    }
                }

                if (!empty($matchedOverride['custom_cc']) && is_array($matchedOverride['custom_cc'])) {
                    foreach ($matchedOverride['custom_cc'] as $cc) {
                        $trimmedCc = trim($cc);
                        if (!empty($trimmedCc) && filter_var($trimmedCc, FILTER_VALIDATE_EMAIL)) {
                            $recipients['cc'][] = $trimmedCc;
                        }
                    }
                }

                // If a valid custom TO was resolved, use it directly (with applicant copy)
                if (!empty($recipients['to'])) {
                    if (!empty($user->email) && filter_var($user->email, FILTER_VALIDATE_EMAIL)) {
                        $recipients['cc'][] = trim($user->email);
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
            if ($tl && $tl->email && $tl->id !== $user->id && filter_var($tl->email, FILTER_VALIDATE_EMAIL)) {
                $teamLeadEmail = trim($tl->email);
            }
        }

        // Apply TO routing
        if (!empty($rule['notify_tl']) && $teamLeadEmail) {
            $recipients['to'][] = $teamLeadEmail;
        }

        if (!empty($rule['custom_to']) && is_array($rule['custom_to'])) {
            foreach ($rule['custom_to'] as $toEmail) {
                $trimmed = trim($toEmail);
                if (!empty($trimmed) && filter_var($trimmed, FILTER_VALIDATE_EMAIL)) {
                    $recipients['to'][] = $trimmed;
                }
            }
        }

        // Fallback to admin if no TO found
        if (empty($recipients['to'])) {
            $recipients['to'][] = 'admin@intersmart.in';
        }

        // Apply CC routing
        if (!empty($rule['custom_cc']) && is_array($rule['custom_cc'])) {
            foreach ($rule['custom_cc'] as $ccEmail) {
                $trimmed = trim($ccEmail);
                if (!empty($trimmed) && filter_var($trimmed, FILTER_VALIDATE_EMAIL)) {
                    $recipients['cc'][] = $trimmed;
                }
            }
        }

        if (!empty($rule['notify_hr'])) {
            $recipients['cc'][] = 'hr@intersmart.in';
        }
        if (!empty($rule['notify_admin'])) {
            $recipients['cc'][] = 'admin@intersmart.in';
        }

        // Merge any custom CC from matched employee override if custom_to was empty
        if ($matchedOverride && !empty($matchedOverride['custom_cc']) && is_array($matchedOverride['custom_cc'])) {
            foreach ($matchedOverride['custom_cc'] as $cc) {
                $trimmed = trim($cc);
                if (!empty($trimmed) && filter_var($trimmed, FILTER_VALIDATE_EMAIL)) {
                    $recipients['cc'][] = $trimmed;
                }
            }
        }

        // Applicant copy
        if (!empty($rule['cc_applicant']) && !empty($user->email) && filter_var($user->email, FILTER_VALIDATE_EMAIL)) {
            $recipients['cc'][] = trim($user->email);
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
     * Send TA Approval & Receipt email notification to employee + CCs
     */
    public static function sendTAApprovedEmail(TARequest $taRequest, array $emailData = []): void
    {
        try {
            self::applySmtpConfig();
            $taRequest->loadMissing(['user', 'items']);

            $user = $taRequest->user;
            if (!$user || empty($user->email)) {
                return;
            }

            $recipients = self::resolveRecipients('ta_approved', $user, ['ta_request' => $taRequest]);
            $toEmails = !empty($recipients['to']) ? $recipients['to'] : [$user->email];
            $ccEmails = $recipients['cc'] ?? [];

            // Always ensure the applicant employee is included in TO if not present
            if (!in_array($user->email, $toEmails)) {
                $toEmails[] = $user->email;
            }

            foreach ($toEmails as $email) {
                try {
                    $ccList = array_values(array_filter($ccEmails, fn($cc) => strtolower($cc) !== strtolower($email)));
                    $mail = Mail::to($email);
                    if (!empty($ccList)) {
                        $mail->cc($ccList);
                    }
                    $mail->send(new TAApprovedMail($taRequest, $emailData));
                    Log::info("✅ TA Approval & Receipt Email sent to {$email}");
                } catch (\Throwable $e) {
                    Log::error("❌ Failed to send TA approval email to {$email}: " . $e->getMessage());
                }
            }
        } catch (\Throwable $e) {
            Log::error("💥 Critical error in sendTAApprovedEmail: " . $e->getMessage());
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
            'portal_url'       => self::getFrontendUrl(),
            'approvals_url'    => self::getFrontendUrl() . '/leaves/approvals'
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
            'portal_url'       => self::getFrontendUrl(),
            'approvals_url'    => self::getFrontendUrl() . '/leaves/approvals?tab=wfh'
        ];
    }

    /**
     * Get frontend base URL, strictly sanitizing any legacy vercel.app URLs to https://www.workplace.intersmart.in
     */
    public static function getFrontendUrl(): string
    {
        $url = env('FRONTEND_URL') ?: config('app.frontend_url', 'https://www.workplace.intersmart.in');
        if (!$url || str_contains($url, 'vercel.app')) {
            $url = 'https://www.workplace.intersmart.in';
        }
        return rtrim($url, '/');
    }

    /**
     * Broadcast email notification to all active employees when a post/praise/poll is created.
     */
    public static function sendCommunityBroadcastEmail(CommunityPost $post): void
    {
        try {
            self::applySmtpConfig();
            $post->loadMissing(['user']);

            $author = $post->user;
            $authorName = $author ? trim("{$author->first_name} {$author->last_name}") : 'A colleague';
            $authorDesignation = $author?->designation ?? 'Team Member';
            $frontendUrl = self::getFrontendUrl();
            $actionUrl = $frontendUrl . '/community';

            $type = $post->type ?? 'post';
            $pollData = $post->poll_data ?? [];

            if ($type === 'praise') {
                $praisedNames = [];
                if (!empty($pollData['praised_user_ids']) && is_array($pollData['praised_user_ids'])) {
                    $praisedUsers = User::whereIn('id', $pollData['praised_user_ids'])->get();
                    $praisedNames = $praisedUsers->map(fn($u) => trim("{$u->first_name} {$u->last_name}"))->filter()->values()->all();
                } elseif (!empty($pollData['praised_user_id'])) {
                    $pUser = User::find($pollData['praised_user_id']);
                    if ($pUser) $praisedNames[] = trim("{$pUser->first_name} {$pUser->last_name}");
                }
                $praisedStr = !empty($praisedNames) ? implode(', ', $praisedNames) : 'the team';
                $badge = $pollData['badge'] ?? null;

                $subject = "🎖️ New Praise: {$authorName} praised {$praisedStr}";
                $typeBadge = "Praise & Recognition";
                $headline = "{$authorName} praised {$praisedStr}!";
                $subheadline = "Check out this recognition on the Workplace Community Feed";
            } elseif ($type === 'poll') {
                $subject = "📊 New Poll: \"{$post->content}\" by {$authorName}";
                $typeBadge = "Community Poll";
                $headline = "{$authorName} created a new poll";
                $subheadline = "Cast your vote and see what the team thinks";
                $praisedStr = null;
                $badge = null;
            } else {
                $snippet = mb_strlen($post->content) > 50 ? mb_substr($post->content, 0, 47) . '...' : $post->content;
                $subject = "📝 New Post from {$authorName}: \"{$snippet}\"";
                $typeBadge = "Community Post";
                $headline = "{$authorName} shared a new post";
                $subheadline = "Join the conversation on Workplace Community";
                $praisedStr = null;
                $badge = null;
            }

            $emailData = [
                'subject'            => $subject,
                'type_badge'         => $typeBadge,
                'headline'           => $headline,
                'subheadline'        => $subheadline,
                'author_name'        => $authorName,
                'author_designation' => $authorDesignation,
                'content'            => $post->content,
                'badge'              => $badge,
                'praised_names'      => $praisedStr,
                'poll_options'       => $pollData['options'] ?? null,
                'action_url'         => $actionUrl,
                'created_at'         => $post->created_at ? $post->created_at->format('d M Y, h:i A') : date('d M Y, h:i A'),
            ];

            // Fetch all active employees with valid emails, excluding author
            $allEmployees = User::where('status', 'active')
                ->when($author, fn($q) => $q->where('id', '!=', $author->id))
                ->whereNotNull('email')
                ->where('email', '!=', '')
                ->pluck('email')
                ->filter(fn($e) => filter_var(trim($e), FILTER_VALIDATE_EMAIL))
                ->map(fn($e) => trim(strtolower($e)))
                ->unique()
                ->values()
                ->all();

            if (empty($allEmployees)) {
                Log::info("ℹ️ No eligible employee recipients for community broadcast mail.");
                return;
            }

            $fromAddr = config('mail.from.address', env('MAIL_FROM_ADDRESS', 'career@intersmart.in'));

            // Send in BCC batches of 40 to avoid SMTP timeout or BCC limit
            $chunks = array_chunk($allEmployees, 40);
            foreach ($chunks as $chunk) {
                try {
                    Mail::to($fromAddr)
                        ->bcc($chunk)
                        ->send(new CommunityBroadcastMail($emailData));
                    Log::info("✅ Sent community broadcast email batch to " . count($chunk) . " employees.");
                } catch (\Throwable $e) {
                    Log::error("❌ Failed to send community broadcast email batch: " . $e->getMessage());
                }
            }
        } catch (\Throwable $e) {
            Log::error("💥 Error in sendCommunityBroadcastEmail: " . $e->getMessage());
        }
    }
}
