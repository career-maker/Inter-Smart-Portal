<?php

namespace App\Mail;

use App\Models\LeaveRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LeaveRequestNotification extends Mailable
{
    use Queueable, SerializesModels;

    public LeaveRequest $leaveRequest;
    public string $approverType;

    public function __construct(LeaveRequest $leaveRequest, string $approverType = 'both')
    {
        $this->leaveRequest = $leaveRequest;
        $this->approverType = $approverType;
    }

    public function envelope(): Envelope
    {
        $this->leaveRequest->load(['user', 'leaveType']);

        $employee = $this->leaveRequest->user;
        $leaveType = $this->leaveRequest->leaveType?->name ?? 'Leave';

        if ($this->leaveRequest->start_date->format('Y-m-d') === $this->leaveRequest->end_date->format('Y-m-d')) {
            $dateRange = $this->leaveRequest->start_date->format('d M Y');
        } else {
            $dateRange = $this->leaveRequest->start_date->format('d M Y') . ' - ' . $this->leaveRequest->end_date->format('d M Y');
        }

        return new Envelope(
            subject: "Leave Request | {$employee->first_name} {$employee->last_name} | {$leaveType} | {$dateRange}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.leave-request',
            with: [
                'leaveRequest' => $this->leaveRequest,
                'approverType' => $this->approverType,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
