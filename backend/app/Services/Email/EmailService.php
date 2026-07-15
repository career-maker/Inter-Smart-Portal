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

            // Generate HTML email content
            $html = view('emails.leave-request', ['data' => $emailData, 'leaveRequest' => $leaveRequest])->render();

            foreach ($recipients['to'] as $email) {
                try {
                    error_log("📬 Attempting to send email via Brevo API to: {$email}");
                    self::sendViaBrevoAPI(
                        $email,
                        "Leave Request | {$emailData['employee_name']} | {$emailData['leave_type']}",
                        $html,
                        $recipients['cc'],
                        $recipients['bcc']
                    );
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
            error_log("🔵 EmailService: sendWfhRequestEmail called for request ID: {$wfhRequest->id}");

            $wfhRequest->load(['user']);

            $emailData = self::prepareWfhEmailData($wfhRequest);
            $recipients = self::getWfhEmailRecipients($wfhRequest->user);

            error_log("📧 WFH Recipients resolved: TO=" . json_encode($recipients['to']) . " CC=" . json_encode($recipients['cc']));

            if (empty($recipients['to'])) {
                error_log("❌ NO RECIPIENTS - WFH request {$wfhRequest->id}");
                return;
            }

            // Generate HTML email content
            $html = view('emails.wfh-request', ['data' => $emailData, 'wfhRequest' => $wfhRequest])->render();

            foreach ($recipients['to'] as $email) {
                try {
                    error_log("📬 Attempting to send WFH email via Brevo API to: {$email}");
                    self::sendViaBrevoAPI(
                        $email,
                        "WFH Request | {$emailData['employee_name']} | {$emailData['start_date']}",
                        $html,
                        $recipients['cc'],
                        $recipients['bcc']
                    );
                    error_log("✅ WFH EMAIL SENT to {$email}");
                } catch (\Exception $e) {
                    error_log("❌ FAILED to send WFH email to {$email}: " . $e->getMessage());
                }
            }
        } catch (\Exception $e) {
            error_log("💥 CRITICAL WFH EMAIL SERVICE ERROR: " . $e->getMessage());
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

    /**
     * Send email via Brevo HTTP API
     */
    private static function sendViaBrevoAPI($toEmail, $subject, $htmlContent, $ccEmails = [], $bccEmails = []): void
    {
        $apiKey = env('BREVO_API_KEY');
        if (!$apiKey) {
            throw new \Exception("BREVO_API_KEY not configured");
        }

        $fromAddress = env('MAIL_FROM_ADDRESS', 'hello@example.com');
        $fromName = env('MAIL_FROM_NAME', 'Intersmart HR Portal');

        // Build recipient list
        $to = [['email' => $toEmail]];
        $cc = [];
        foreach ($ccEmails as $email) {
            $cc[] = ['email' => $email];
        }
        $bcc = [];
        foreach ($bccEmails as $email) {
            $bcc[] = ['email' => $email];
        }

        // Prepare API payload
        $payload = [
            'sender' => [
                'email' => $fromAddress,
                'name' => $fromName
            ],
            'to' => $to,
            'subject' => $subject,
            'htmlContent' => $htmlContent
        ];

        if (!empty($cc)) {
            $payload['cc'] = $cc;
        }
        if (!empty($bcc)) {
            $payload['bcc'] = $bcc;
        }

        // Make API request
        $client = new \GuzzleHttp\Client();
        $response = $client->post('https://api.brevo.com/v3/smtp/email', [
            'headers' => [
                'api-key' => $apiKey,
                'Content-Type' => 'application/json'
            ],
            'json' => $payload
        ]);

        if ($response->getStatusCode() !== 201) {
            throw new \Exception("Brevo API returned status " . $response->getStatusCode());
        }
    }
}
