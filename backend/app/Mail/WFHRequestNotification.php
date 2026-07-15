<?php

namespace App\Mail;

use App\Models\WFHRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WFHRequestNotification extends Mailable
{
    use Queueable, SerializesModels;

    public WFHRequest $wfhRequest;

    public function __construct(WFHRequest $wfhRequest)
    {
        $this->wfhRequest = $wfhRequest;
    }

    public function envelope(): Envelope
    {
        $this->wfhRequest->load('user');

        $employee = $this->wfhRequest->user;

        if ($this->wfhRequest->start_date->format('Y-m-d') === $this->wfhRequest->end_date->format('Y-m-d')) {
            $dateRange = $this->wfhRequest->start_date->format('d M Y');
        } else {
            $dateRange = $this->wfhRequest->start_date->format('d M Y') . ' - ' . $this->wfhRequest->end_date->format('d M Y');
        }

        return new Envelope(
            subject: "WFH Request | {$employee->first_name} {$employee->last_name} | {$dateRange}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.wfh-request',
            with: [
                'wfhRequest' => $this->wfhRequest,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
