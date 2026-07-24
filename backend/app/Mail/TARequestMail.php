<?php

namespace App\Mail;

use App\Models\TARequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class TARequestMail extends Mailable
{
    use Queueable, SerializesModels;

    public TARequest $taRequest;
    public array $emailData;

    public function __construct(TARequest $taRequest, array $emailData = [])
    {
        $this->taRequest = $taRequest;
        $this->emailData = $emailData;
    }

    public function envelope()
    {
        return new \Illuminate\Mail\Mailables\Envelope(
            subject: "Travel Allowance Request - {$this->emailData['employee_name']} - ₹{$this->taRequest->total_amount}"
        );
    }

    public function content()
    {
        return new \Illuminate\Mail\Mailables\Content(
            view: 'emails.ta-request',
            with: [
                'taRequest' => $this->taRequest,
                'data' => $this->emailData,
            ]
        );
    }

    public function attachments()
    {
        return [];
    }
}
