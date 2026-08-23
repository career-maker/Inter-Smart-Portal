<?php

namespace App\Notifications;

use App\Models\DocumentRequest;
use Illuminate\Notifications\Notification;

class DocumentRequestNotification extends Notification
{
    public function __construct(
        public DocumentRequest $documentRequest,
        public string $message,
        public string $title = 'New HR Document Request',
        public string $event = 'document_requested',
        public string $actionUrl = '/documents'
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title'               => $this->title,
            'message'             => $this->message,
            'event'               => $this->event,
            'document_request_id' => $this->documentRequest->id,
            'action_url'          => $this->actionUrl,
        ];
    }
}
