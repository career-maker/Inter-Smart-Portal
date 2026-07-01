<?php

namespace App\Notifications;

use App\Models\DocumentRequest;
use Illuminate\Notifications\Notification;

class DocumentRequestNotification extends Notification
{
    public function __construct(
        public DocumentRequest $documentRequest,
        public string $message
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title'               => 'New HR Document Request',
            'message'             => $this->message,
            'event'               => 'document_requested',
            'document_request_id' => $this->documentRequest->id,
            'action_url'          => '/documents',
        ];
    }
}
