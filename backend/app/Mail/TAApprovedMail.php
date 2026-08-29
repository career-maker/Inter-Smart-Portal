<?php

namespace App\Mail;

use App\Models\TARequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class TAApprovedMail extends Mailable
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
        $receiptNo = $this->taRequest->receipt_number ? " [{$this->taRequest->receipt_number}]" : "";
        return new \Illuminate\Mail\Mailables\Envelope(
            subject: "✅ Travel Allowance Approved{$receiptNo} - ₹" . number_format((float)($this->taRequest->approved_amount ?? $this->taRequest->total_amount), 2)
        );
    }

    public function content()
    {
        return new \Illuminate\Mail\Mailables\Content(
            view: 'emails.ta-approved',
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
