<?php

namespace App\Services\Email;

use App\Models\LeaveRequest;
use App\Models\WfhRequest;
use App\Mail\LeaveRequestMail;
use App\Mail\WfhRequestMail;
use App\Mail\RecognitionMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class EmailService
{
    /**
     * Send email notification for a leave request
     * Never throws exceptions - logs errors and continues
     */
    public static function sendLeaveRequestEmail(LeaveRequest $leaveRequest): void
    {
        try {
            Log::info("🔵 EmailService: sendLeaveRequestEmail called for request ID: {$leaveRequest->id}");

            $leaveRequest->load(['user', 'leaveType']);
            Log::info("📋 User loaded: {$leaveRequest->user->first_name}, team_id: " . ($leaveRequest->user->team_id ?? 'NULL'));

            $emailData = self::prepareLeaveEmailData($leaveRequest);
            $recipients = self::getLeaveEmailRecipients($leaveRequest->user);

            Log::info("📧 Recipients resolved: TO=" . json_encode($recipients['to']) . " CC=" . json_encode($recipients['cc']));

            if (empty($recipients['to'])) {
                Log::warning("❌ NO RECIPIENTS - user {$leaveRequest->user->id} has no team lead email");
                return;
            }

            foreach ($recipients['to'] as $email) {
                try {
                    Log::info("📬 Attempting to send email via Laravel Mail to: {$email}");
                    
                    // Filter out TO address from CC list to prevent duplicate headers/deliveries
                    $ccList = array_values(array_filter($recipients['cc'], fn($cc) => strtolower($cc) !== strtolower($email)));

                    $mail = Mail::to($email);
                    if (!empty($ccList)) {
                        $mail->cc($ccList);
                    }
                    if (!empty($recipients['bcc'])) {
                        $mail->bcc($recipients['bcc']);
                    }
                    
                    $mail->send(new LeaveRequestMail($emailData, $leaveRequest, $ccList));
                    
                    Log::info("✅ LEAVE EMAIL SENT to {$email} (CC: " . json_encode($ccList) . ")");
                } catch (\Exception $e) {
                    Log::error("❌ FAILED to send leave email to {$email}: " . $e->getMessage());
                }
            }
        } catch (\Exception $e) {
            Log::error("💥 CRITICAL EMAIL SERVICE ERROR: " . $e->getMessage());
        }
    }

    /**
     * Send email notification for a WFH request
     */
    public static function sendWfhRequestEmail(WfhRequest $wfhRequest): void
    {
        try {
            Log::info("🔵 EmailService: sendWfhRequestEmail called for request ID: {$wfhRequest->id}");

            $wfhRequest->load(['user']);

            $emailData = self::prepareWfhEmailData($wfhRequest);
            $recipients = self::getWfhEmailRecipients($wfhRequest->user);

            Log::info("📧 WFH Recipients resolved: TO=" . json_encode($recipients['to']) . " CC=" . json_encode($recipients['cc']));

            if (empty($recipients['to'])) {
                Log::warning("❌ NO RECIPIENTS - WFH request {$wfhRequest->id}");
                return;
            }

            foreach ($recipients['to'] as $email) {
                try {
                    Log::info("📬 Attempting to send WFH email via Laravel Mail to: {$email}");
                    
                    // Filter out TO address from CC list
                    $ccList = array_values(array_filter($recipients['cc'], fn($cc) => strtolower($cc) !== strtolower($email)));

                    $mail = Mail::to($email);
                    if (!empty($ccList)) {
                        $mail->cc($ccList);
                    }
                    if (!empty($recipients['bcc'])) {
                        $mail->bcc($recipients['bcc']);
                    }
                    
                    $mail->send(new WfhRequestMail($emailData, $wfhRequest, $ccList));
                    
                    Log::info("✅ WFH EMAIL SENT to {$email} (CC: " . json_encode($ccList) . ")");
                } catch (\Exception $e) {
                    Log::error("❌ FAILED to send WFH email to {$email}: " . $e->getMessage());
                }
            }
        } catch (\Exception $e) {
            Log::error("💥 CRITICAL WFH EMAIL SERVICE ERROR: " . $e->getMessage());
        }
    }

    /**
     * Determine leave email recipients based on leave type and duration
     */
    private static function getLeaveEmailRecipients($user): array
    {
        Log::info("🔎 Recipient lookup for user ID: {$user->id}, team_id: " . ($user->team_id ?? 'NULL'));

        $teamLead = null;
        if ($user->team_id) {
            $team = \App\Models\Team::find($user->team_id);
            if ($team) {
                Log::info("🏢 Team found: {$team->name} (ID: {$team->id}), team_lead_id: " . ($team->team_lead_id ?? 'NULL'));
                $teamLead = $team->teamLead;
                Log::info("👤 Team Lead found: " . ($teamLead ? $teamLead->email : 'NULL'));
            } else {
                Log::warning("❌ Team not found for team_id: {$user->team_id}");
            }
        } else {
            Log::warning("⚠️  User has NO team_id");
        }

        $recipients = [
            'to' => [],
            'cc' => [],
            'bcc' => []
        ];

        // Always notify Team Lead if available
        if ($teamLead && $teamLead->email && $teamLead->id !== $user->id) {
            Log::info("✅ Adding team lead to recipients: {$teamLead->email}");
            $recipients['to'][] = $teamLead->email;
            $recipients['cc'] = ['hr@intersmart.in', 'admin@intersmart.in'];
        } else {
            if (!$teamLead) {
                Log::warning("❌ NO TEAM LEAD FOUND. Falling back to Admin.");
            } elseif (!$teamLead->email) {
                Log::warning("❌ TEAM LEAD HAS NO EMAIL. Falling back to Admin.");
            } elseif ($teamLead->id === $user->id) {
                Log::warning("❌ TEAM LEAD IS SAME USER. Falling back to Admin.");
            }
            $recipients['to'][] = 'admin@intersmart.in';
            $recipients['cc'] = ['hr@intersmart.in'];
        }

        // Add applicant employee's email to CC so they receive a copy
        if (!empty($user->email)) {
            $recipients['cc'][] = $user->email;
        }

        // Unique & clean CC list
        $recipients['cc'] = array_values(array_unique(array_filter($recipients['cc'])));

        return $recipients;
    }

    /**
     * Determine WFH email recipients
     */
    private static function getWfhEmailRecipients($user): array
    {
        $teamLead = null;
        if ($user->team_id) {
            $team = \App\Models\Team::find($user->team_id);
            $teamLead = $team?->teamLead;
        }

        $recipients = [
            'to' => [],
            'cc' => [],
            'bcc' => []
        ];

        // Notify Team Lead if available
        if ($teamLead && $teamLead->email && $teamLead->id !== $user->id) {
            $recipients['to'][] = $teamLead->email;
            $recipients['cc'] = ['hr@intersmart.in', 'admin@intersmart.in'];
        } else {
            $recipients['to'][] = 'admin@intersmart.in';
            $recipients['cc'] = ['hr@intersmart.in'];
        }

        // Add applicant employee's email to CC so they receive a copy
        if (!empty($user->email)) {
            $recipients['cc'][] = $user->email;
        }

        // Unique & clean CC list
        $recipients['cc'] = array_values(array_unique(array_filter($recipients['cc'])));

        return $recipients;
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
            'employee_name' => "{$user->first_name} {$user->last_name}",
            'employee_id' => $user->employee_code,
            'department' => $user->team?->name ?? 'N/A',
            'designation' => $user->designation ?? 'N/A',
            'leave_type' => $leaveType->name ?? 'Leave',
            'start_date' => $startDate,
            'end_date' => $endDate,
            'is_single_day' => $isSingleDay,
            'days' => $leaveRequest->days,
            'reason' => $leaveRequest->reason,
            'applied_date' => $leaveRequest->created_at->format('d M Y'),
            'reference_number' => "LR-{$leaveRequest->id}",
            'request_id' => $leaveRequest->id,
            'portal_url' => config('app.frontend_url', 'https://intersmart-portal.vercel.app'),
            'approvals_url' => config('app.frontend_url', 'https://intersmart-portal.vercel.app') . '/leaves/approvals'
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
            'employee_name' => "{$user->first_name} {$user->last_name}",
            'employee_id' => $user->employee_code,
            'department' => $user->team?->name ?? 'N/A',
            'designation' => $user->designation ?? 'N/A',
            'duration_type' => $wfhRequest->duration_type,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'is_single_day' => $isSingleDay,
            'reason' => $wfhRequest->reason,
            'applied_date' => $wfhRequest->created_at->format('d M Y'),
            'reference_number' => "WFH-{$wfhRequest->id}",
            'request_id' => $wfhRequest->id,
            'portal_url' => config('app.frontend_url', 'https://intersmart-portal.vercel.app'),
            'approvals_url' => config('app.frontend_url', 'https://intersmart-portal.vercel.app') . '/wfh/approvals'
        ];
    }

    /**
     * Send recognition/award email notification
     */
    public static function sendRecognitionEmail($user, $recognition): void
    {
        try {
            Log::info("🔵 EmailService: sendRecognitionEmail called for user ID: {$user->id}");

            if (!$user->email) {
                Log::warning("❌ NO EMAIL - user {$user->id} has no email address");
                return;
            }

            $emailData = [
                'employee_name' => "{$user->first_name} {$user->last_name}",
                'employee_id' => $user->employee_code,
                'department' => $user->team?->name ?? 'N/A',
                'designation' => $user->designation ?? 'N/A',
                'title' => $recognition->title,
                'description' => $recognition->description,
                'icon' => $recognition->icon ?? '⭐',
                'start_date' => $recognition->start_date->format('d M Y'),
                'end_date' => $recognition->end_date->format('d M Y'),
                'awarded_by' => $recognition->creator ? "{$recognition->creator->first_name} {$recognition->creator->last_name}" : 'Management',
            ];

            Log::info("📧 Recognition email data prepared for user: {$user->email}");

            try {
                Log::info("📬 Attempting to send recognition email via Laravel Mail to: {$user->email}");
                
                Mail::to($user->email)->send(new RecognitionMail($emailData));
                
                Log::info("✅ RECOGNITION EMAIL SENT to {$user->email}");
            } catch (\Exception $e) {
                Log::error("❌ FAILED to send recognition email to {$user->email}: " . $e->getMessage());
            }
        } catch (\Exception $e) {
            Log::error("💥 CRITICAL RECOGNITION EMAIL SERVICE ERROR: " . $e->getMessage());
        }
    }
}

