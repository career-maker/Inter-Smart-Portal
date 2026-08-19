<?php

namespace App\Mail;

use App\Models\WfhRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WfhRequestMail extends Mailable
{
    use Queueable, SerializesModels;

    public array $emailData;
    public WfhRequest $wfhRequest;
    public array $ccRecipients;

    public function __construct(array $emailData, WfhRequest $wfhRequest, array $ccRecipients = [])
    {
        $this->emailData = $emailData;
        $this->wfhRequest = $wfhRequest;
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

        $subject = "WFH Request | {$this->emailData['employee_name']} | {$dateStr}";

        return new Envelope(
            subject: $subject,
            cc: $this->ccRecipients
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.wfh-request',
            with: [
                'data' => $this->emailData,
                'wfhRequest' => $this->wfhRequest
            ]
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
