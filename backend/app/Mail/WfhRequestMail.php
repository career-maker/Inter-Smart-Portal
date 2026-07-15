<?php

namespace App\Mail;

use App\Models\WfhRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class WfhRequestMail extends Mailable
{
    use Queueable, SerializesModels;

    public array $emailData;
    public WfhRequest $wfhRequest;

    public function __construct(array $emailData, WfhRequest $wfhRequest)
    {
        $this->emailData = $emailData;
        $this->wfhRequest = $wfhRequest;
    }

    public function envelope()
    {
        $isSingleDay = $this->emailData['is_single_day'];
        $dateStr = $isSingleDay
            ? $this->emailData['start_date']
            : "{$this->emailData['start_date']} - {$this->emailData['end_date']}";

        $subject = "WFH Request | {$this->emailData['employee_name']} | {$dateStr}";

        return new \Illuminate\Mail\Mailables\Envelope(
            subject: $subject
        );
    }

    public function content()
    {
        return new \Illuminate\Mail\Mailables\Content(
            view: 'emails.wfh-request',
            with: [
                'data' => $this->emailData,
                'wfhRequest' => $this->wfhRequest
            ]
        );
    }

    public function attachments()
    {
        return [];
    }
}
