<?php

namespace App\Mail;

use App\Models\LeaveRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LeaveRequestMail extends Mailable
{
    use Queueable, SerializesModels;

    public array $emailData;
    public LeaveRequest $leaveRequest;
    public array $ccRecipients;

    public function __construct(array $emailData, LeaveRequest $leaveRequest, array $ccRecipients = [])
    {
        $this->emailData = $emailData;
        $this->leaveRequest = $leaveRequest;
        $this->ccRecipients = $ccRecipients;

        if (!empty($ccRecipients)) {
            $this->cc($ccRecipients);
        }
    }

    public function envelope(): Envelope
    {
        $isSingleDay = $this->emailData['is_single_day'];
        $dateStr = $isSingleDay
            ? $this->emailData['start_date']
            : "{$this->emailData['start_date']} - {$this->emailData['end_date']}";

        $subject = "Leave Request | {$this->emailData['employee_name']} | {$this->emailData['leave_type']} | {$dateStr}";

        return new Envelope(
            subject: $subject,
            cc: $this->ccRecipients
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.leave-request',
            with: [
                'data' => $this->emailData,
                'leaveRequest' => $this->leaveRequest
            ]
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
