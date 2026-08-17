<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class RecognitionMail extends Mailable
{
    use Queueable, SerializesModels;

    public array $emailData;

    public function __construct(array $emailData)
    {
        $this->emailData = $emailData;
    }

    public function envelope()
    {
        $subject = "🏆 Recognition Award: {$this->emailData['title']} | {$this->emailData['employee_name']}";

        return new \Illuminate\Mail\Mailables\Envelope(
            subject: $subject
        );
    }

    public function content()
    {
        return new \Illuminate\Mail\Mailables\Content(
            view: 'emails.recognition-award',
            with: [
                'data' => $this->emailData
            ]
        );
    }

    public function attachments()
    {
        return [];
    }
}
