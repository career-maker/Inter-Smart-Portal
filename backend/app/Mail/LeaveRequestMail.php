<?php

namespace App\Mail;

use App\Models\LeaveRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class LeaveRequestMail extends Mailable
{
    use Queueable, SerializesModels;

    public array $emailData;
    public LeaveRequest $leaveRequest;

    public function __construct(array $emailData, LeaveRequest $leaveRequest)
    {
        $this->emailData = $emailData;
        $this->leaveRequest = $leaveRequest;
    }

    public function envelope()
    {
        $isSingleDay = $this->emailData['is_single_day'];
        $dateStr = $isSingleDay
            ? $this->emailData['start_date']
            : "{$this->emailData['start_date']} - {$this->emailData['end_date']}";

        $subject = "Leave Request | {$this->emailData['employee_name']} | {$this->emailData['leave_type']} | {$dateStr}";

        return new \Illuminate\Mail\Mailables\Envelope(
            subject: $subject
        );
    }

    public function content()
    {
        return new \Illuminate\Mail\Mailables\Content(
            view: 'emails.leave-request',
            with: [
                'data' => $this->emailData,
                'leaveRequest' => $this->leaveRequest
            ]
        );
    }

    public function attachments()
    {
        return [];
    }
}
