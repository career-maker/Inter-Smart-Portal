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
            $leaveRequest->load(['user', 'leaveType']);

            $emailData = self::prepareLeaveEmailData($leaveRequest);
            $recipients = self::getLeaveEmailRecipients($leaveRequest->user);

            if (empty($recipients['to'])) {
                Log::info("No recipients for leave request {$leaveRequest->id}");
                return;
            }

            foreach ($recipients['to'] as $email) {
                try {
                    Mail::to($email)
                        ->cc($recipients['cc'] ?? [])
                        ->bcc($recipients['bcc'] ?? [])
                        ->send(new \App\Mail\LeaveRequestMail($emailData, $leaveRequest));

                    Log::info("Leave email sent", [
                        'leave_request_id' => $leaveRequest->id,
                        'recipient' => $email,
                        'type' => 'single_to'
                    ]);
                } catch (\Exception $e) {
                    Log::warning("Failed to send leave email to {$email}", [
                        'leave_request_id' => $leaveRequest->id,
                        'error' => $e->getMessage()
                    ]);
                }
            }
        } catch (\Exception $e) {
            Log::error("Leave email service error: {$e->getMessage()}", [
                'leave_request_id' => $leaveRequest->id ?? null,
                'trace' => $e->getTraceAsString()
            ]);
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

        // Always notify Team Lead if available
        if ($teamLead && $teamLead->email && $teamLead->id !== $user->id) {
            $recipients['to'][] = $teamLead->email;
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
