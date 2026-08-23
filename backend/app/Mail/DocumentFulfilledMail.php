<?php

namespace App\Mail;

use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class DocumentFulfilledMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public DocumentRequest $documentRequest,
        public DocumentUpload $documentUpload,
        public User $recipient
    ) {}

    public function envelope(): Envelope
    {
        $subjectTitle = $this->documentRequest->subject;
        $reqNo = $this->documentRequest->request_number;

        return new Envelope(
            subject: "Document Ready: {$subjectTitle} ({$reqNo})"
        );
    }

    public function content(): Content
    {
        $employeeName = "{$this->recipient->first_name} {$this->recipient->last_name}";
        $frontendUrl = env('FRONTEND_URL', config('app.frontend_url', 'https://www.workplace.intersmart.in'));
        $backendUrl = config('app.url', 'https://www.workplace.intersmart.in/api');
        
        $fileUrl = $this->documentUpload->file_path 
            ? rtrim($backendUrl, '/') . '/storage/' . $this->documentUpload->file_path 
            : null;

        return new Content(
            view: 'emails.document-fulfilled',
            with: [
                'employeeName'  => $employeeName,
                'employeeId'    => $this->recipient->employee_code,
                'requestNumber' => $this->documentRequest->request_number,
                'subject'       => $this->documentRequest->subject,
                'description'   => $this->documentRequest->description,
                'comments'      => $this->documentUpload->comments,
                'documentUrl'   => $this->documentUpload->document_url,
                'fileUrl'       => $fileUrl,
                'portalUrl'     => rtrim($frontendUrl, '/') . '/documents',
            ]
        );
    }

    public function attachments(): array
    {
        $attachments = [];

        if ($this->documentUpload->file_path) {
            try {
                if (Storage::disk('public')->exists($this->documentUpload->file_path)) {
                    $fullPath = Storage::disk('public')->path($this->documentUpload->file_path);
                    $attachments[] = Attachment::fromPath($fullPath);
                }
            } catch (\Exception $e) {
                // Ignore attachment errors so mail still sends
            }
        }

        return $attachments;
    }
}
