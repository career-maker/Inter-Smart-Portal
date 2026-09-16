<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CommunityBroadcastMail extends Mailable
{
    use Queueable, SerializesModels;

    public array $emailData;

    public function __construct(array $emailData)
    {
        $this->emailData = $emailData;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->emailData['subject'] ?? 'New Community Update | Inter Smart Portal'
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.community-broadcast',
            with: [
                'data' => $this->emailData
            ]
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
