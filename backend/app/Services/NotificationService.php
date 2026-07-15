<?php

namespace App\Services;

use App\Mail\LeaveRequestNotification;
use App\Mail\WFHRequestNotification;
use App\Models\LeaveRequest;
use App\Models\WFHRequest;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Send leave request notification emails based on request type
     *
     * @param LeaveRequest $leaveRequest
     * @return void
     */
    public static function notifyLeaveRequest(LeaveRequest $leaveRequest): void
    {
        try {
            Log::info('🔔 Starting leave notification', ['leave_id' => $leaveRequest->id]);

            $employee = $leaveRequest->user;
            $isSingleDay = self::isSingleDayLeave($leaveRequest);

            Log::info('Leave type detected', [
                'leave_id' => $leaveRequest->id,
                'is_single_day' => $isSingleDay,
                'employee' => $employee->first_name . ' ' . $employee->last_name
            ]);

            if ($isSingleDay) {
                Log::info('Sending single-day leave notification', ['leave_id' => $leaveRequest->id]);
                self::notifySingleDayLeave($leaveRequest, $employee);
            } else {
                Log::info('Sending multi-day leave notification', ['leave_id' => $leaveRequest->id]);
                self::notifyMultipleDayLeave($leaveRequest, $employee);
            }

            Log::info('✅ Leave notification sent successfully', ['leave_id' => $leaveRequest->id]);
        } catch (\Exception $e) {
            Log::error('❌ Failed to send leave notification', [
                'leave_id' => $leaveRequest->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Send WFH request notification emails
     *
     * @param WFHRequest $wfhRequest
     * @return void
     */
    public static function notifyWFHRequest(WFHRequest $wfhRequest): void
    {
        try {
            Log::info('🏠 WFH notification process started', ['wfh_id' => $wfhRequest->id]);

            $employee = $wfhRequest->user;
            $teamLead = $employee->teamLead;

            $recipients = [];

            // Team Lead receives the request
            if ($teamLead && $teamLead->email) {
                $recipients[] = $teamLead->email;
                Log::info('Team Lead added to WFH recipients', ['email' => $teamLead->email]);
            } else {
                Log::warning('⚠️ Team Lead not found or has no email for WFH', ['employee_id' => $employee->id]);
            }

            // HR receives the request
            $recipients[] = 'hr@intersmart.in';
            Log::info('HR added to WFH recipients');

            Log::info('Total WFH recipients', ['count' => count($recipients)]);

            // Send to all recipients
            foreach ($recipients as $email) {
                try {
                    Log::info('Sending WFH email', ['to' => $email, 'wfh_id' => $wfhRequest->id]);

                    Mail::to($email)->send(new WFHRequestNotification($wfhRequest));

                    Log::info("✅ WFH notification sent successfully to {$email}", ['wfh_id' => $wfhRequest->id]);
                } catch (\Exception $e) {
                    Log::error("❌ Failed to send WFH notification to {$email}", [
                        'wfh_id' => $wfhRequest->id,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                }
            }

            Log::info('✅ WFH notification process completed', ['wfh_id' => $wfhRequest->id]);
        } catch (\Exception $e) {
            Log::error('❌ Failed to send WFH notification', [
                'wfh_id' => $wfhRequest->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Single-day leave: Send to Team Lead (CC: HR, Admin)
     *
     * @param LeaveRequest $leaveRequest
     * @param User $employee
     * @return void
     */
    private static function notifySingleDayLeave(LeaveRequest $leaveRequest, User $employee): void
    {
        Log::info('📧 Single-day leave notification process started', ['leave_id' => $leaveRequest->id]);

        $teamLead = $employee->teamLead;

        Log::info('Team Lead lookup', [
            'leave_id' => $leaveRequest->id,
            'team_lead_found' => $teamLead ? 'yes' : 'no',
            'team_lead_email' => $teamLead?->email ?? 'none'
        ]);

        if (!$teamLead || !$teamLead->email) {
            Log::warning('⚠️ Team Lead email not found for single-day leave', [
                'leave_id' => $leaveRequest->id,
                'employee_id' => $employee->id,
                'team_id' => $employee->team_id
            ]);
            return;
        }

        try {
            Log::info('Sending email via Mail facade', [
                'to' => $teamLead->email,
                'cc' => ['hr@intersmart.in', 'admin@intersmart.in']
            ]);

            Mail::to($teamLead->email)
                ->cc(['hr@intersmart.in', 'admin@intersmart.in'])
                ->send(new LeaveRequestNotification($leaveRequest, 'tl_or_hr'));

            Log::info('✅ Single-day leave notification sent successfully', [
                'leave_id' => $leaveRequest->id,
                'to' => $teamLead->email
            ]);
        } catch (\Exception $e) {
            Log::error('❌ Failed to send single-day leave notification', [
                'leave_id' => $leaveRequest->id,
                'to' => $teamLead->email,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Multiple-day leave: Send to Team Lead AND HR
     *
     * @param LeaveRequest $leaveRequest
     * @param User $employee
     * @return void
     */
    private static function notifyMultipleDayLeave(LeaveRequest $leaveRequest, User $employee): void
    {
        Log::info('📧 Multi-day leave notification process started', ['leave_id' => $leaveRequest->id]);

        $teamLead = $employee->teamLead;
        $recipients = [];

        // Team Lead
        if ($teamLead && $teamLead->email) {
            $recipients[] = $teamLead->email;
            Log::info('Team Lead added to recipients', ['email' => $teamLead->email]);
        } else {
            Log::warning('⚠️ Team Lead not found or has no email', ['employee_id' => $employee->id]);
        }

        // HR
        $recipients[] = 'hr@intersmart.in';
        Log::info('HR added to recipients');

        Log::info('Total recipients for multi-day leave', ['count' => count($recipients), 'recipients' => $recipients]);

        foreach ($recipients as $email) {
            try {
                Log::info('Sending multi-day leave email', ['to' => $email]);

                Mail::to($email)->send(new LeaveRequestNotification($leaveRequest, 'multi_day'));

                Log::info('✅ Multi-day leave notification sent successfully', [
                    'leave_id' => $leaveRequest->id,
                    'to' => $email
                ]);
            } catch (\Exception $e) {
                Log::error('❌ Failed to send multi-day leave notification', [
                    'leave_id' => $leaveRequest->id,
                    'to' => $email,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
            }
        }
    }

    /**
     * Check if leave request is for a single day
     *
     * @param LeaveRequest $leaveRequest
     * @return bool
     */
    private static function isSingleDayLeave(LeaveRequest $leaveRequest): bool
    {
        return $leaveRequest->start_date->format('Y-m-d') === $leaveRequest->end_date->format('Y-m-d');
    }
}
