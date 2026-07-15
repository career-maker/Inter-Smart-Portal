<?php

namespace App\Services\Email;

use App\Models\LeaveRequest;
use App\Models\WfhRequest;
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
            error_log("🔵 EmailService: sendLeaveRequestEmail called for request ID: {$leaveRequest->id}");

            $leaveRequest->load(['user', 'leaveType']);
            error_log("📋 User loaded: {$leaveRequest->user->first_name}, team_id: " . ($leaveRequest->user->team_id ?? 'NULL'));

            $emailData = self::prepareLeaveEmailData($leaveRequest);
            $recipients = self::getLeaveEmailRecipients($leaveRequest->user);

            error_log("📧 Recipients resolved: TO=" . json_encode($recipients['to']) . " CC=" . json_encode($recipients['cc']));

            if (empty($recipients['to'])) {
                error_log("❌ NO RECIPIENTS - user {$leaveRequest->user->id} has no team lead email");
                return;
            }

            foreach ($recipients['to'] as $email) {
                try {
                    error_log("📬 Attempting to send email to: {$email}");
                    Mail::to($email)
                        ->cc($recipients['cc'] ?? [])
                        ->bcc($recipients['bcc'] ?? [])
                        ->send(new \App\Mail\LeaveRequestMail($emailData, $leaveRequest));

                    error_log("✅ LEAVE EMAIL SENT to {$email}");
                } catch (\Exception $e) {
                    error_log("❌ FAILED to send leave email to {$email}: " . $e->getMessage());
                }
            }
        } catch (\Exception $e) {
            error_log("💥 CRITICAL EMAIL SERVICE ERROR: " . $e->getMessage());
        }
    }

    /**
     * Send email notification for a WFH request
     */
    public static function sendWfhRequestEmail(WfhRequest $wfhRequest): void
    {
        try {
            $wfhRequest->load(['user']);

            $emailData = self::prepareWfhEmailData($wfhRequest);
            $recipients = self::getWfhEmailRecipients($wfhRequest->user);

            if (empty($recipients['to'])) {
                Log::info("No recipients for WFH request {$wfhRequest->id}");
                return;
            }

            foreach ($recipients['to'] as $email) {
                try {
                    Mail::to($email)
                        ->cc($recipients['cc'] ?? [])
                        ->bcc($recipients['bcc'] ?? [])
                        ->send(new \App\Mail\WfhRequestMail($emailData, $wfhRequest));

                    Log::info("WFH email sent", [
                        'wfh_request_id' => $wfhRequest->id,
                        'recipient' => $email,
                        'type' => 'single_to'
                    ]);
                } catch (\Exception $e) {
                    Log::warning("Failed to send WFH email to {$email}", [
                        'wfh_request_id' => $wfhRequest->id,
                        'error' => $e->getMessage()
                    ]);
                }
            }
        } catch (\Exception $e) {
            Log::error("WFH email service error: {$e->getMessage()}", [
                'wfh_request_id' => $wfhRequest->id ?? null,
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Determine leave email recipients based on leave type and duration
     */
    private static function getLeaveEmailRecipients($user): array
    {
        error_log("🔎 Recipient lookup for user ID: {$user->id}, team_id: " . ($user->team_id ?? 'NULL'));

        $teamLead = null;
        if ($user->team_id) {
            $team = \App\Models\Team::find($user->team_id);
            if ($team) {
                error_log("🏢 Team found: {$team->name} (ID: {$team->id}), team_lead_id: " . ($team->team_lead_id ?? 'NULL'));
                $teamLead = $team->teamLead;
                error_log("👤 Team Lead found: " . ($teamLead ? $teamLead->email : 'NULL'));
            } else {
                error_log("❌ Team not found for team_id: {$user->team_id}");
            }
        } else {
            error_log("⚠️  User has NO team_id");
        }

        $recipients = [
            'to' => [],
            'cc' => ['hr@intersmart.in', 'admin@intersmart.in'],
            'bcc' => []
        ];

        // Always notify Team Lead if available
        if ($teamLead && $teamLead->email && $teamLead->id !== $user->id) {
            error_log("✅ Adding team lead to recipients: {$teamLead->email}");
            $recipients['to'][] = $teamLead->email;
        } else {
            if (!$teamLead) {
                error_log("❌ NO TEAM LEAD FOUND");
            } elseif (!$teamLead->email) {
                error_log("❌ TEAM LEAD HAS NO EMAIL");
            } elseif ($teamLead->id === $user->id) {
                error_log("❌ TEAM LEAD IS SAME USER (cannot send to self)");
            }
        }

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
            'cc' => ['hr@intersmart.in', 'admin@intersmart.in'],
            'bcc' => []
        ];

        // Notify Team Lead if available
        if ($teamLead && $teamLead->email && $teamLead->id !== $user->id) {
            $recipients['to'][] = $teamLead->email;
        }

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
            'portal_url' => config('app.frontend_url', 'https://intersmart-portal.vercel.app')
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
            'portal_url' => config('app.frontend_url', 'https://intersmart-portal.vercel.app')
        ];
    }
}
