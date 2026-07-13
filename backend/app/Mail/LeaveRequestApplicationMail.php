<?php

namespace App\Mail;

use App\Models\LeaveRequest;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\URL;
use Carbon\Carbon;

class LeaveRequestApplicationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public LeaveRequest $leaveRequest,
        public User $applicant,
        public User $teamLead,
        public $leaveType
    ) {}

    public function envelope(): Envelope
    {
        $startDate = Carbon::parse($this->leaveRequest->start_date)->format('M d, Y');
        $endDate = Carbon::parse($this->leaveRequest->end_date)->format('M d, Y');
        $applicantName = "{$this->applicant->first_name} {$this->applicant->last_name}";
        $leaveTypeName = $this->leaveType?->name ?? 'Leave';

        return new Envelope(
            subject: "Leave Application: {$applicantName} - {$leaveTypeName} ({$startDate} to {$endDate})",
            from: config('mail.from.address'),
            cc: ['hr@intersmart.in', 'admin@intersmart.in'],
        );
    }

    public function content(): Content
    {
        $isSingleDay = $this->leaveRequest->start_date === $this->leaveRequest->end_date;
        $startDate = Carbon::parse($this->leaveRequest->start_date)->format('M d, Y');
        $endDate = Carbon::parse($this->leaveRequest->end_date)->format('M d, Y');
        $applicantName = "{$this->applicant->first_name} {$this->applicant->last_name}";
        $applicantEmail = $this->applicant->email;
        $designation = $this->applicant->designation ?? 'N/A';
        $leaveTypeName = $this->leaveType?->name ?? 'Leave';
        $reason = $this->leaveRequest->reason ?? 'No reason provided';
        $days = $this->leaveRequest->days ?? 1;

        // Generate signed action URLs
        $approveUrl = URL::signedRoute('api.leave-request.email-approve', [
            'leaveRequest' => $this->leaveRequest->id,
            'token' => hash_hmac('sha256', "approve-{$this->leaveRequest->id}", config('app.key'))
        ]);

        $rejectUrl = URL::signedRoute('api.leave-request.email-reject', [
            'leaveRequest' => $this->leaveRequest->id,
            'token' => hash_hmac('sha256', "reject-{$this->leaveRequest->id}", config('app.key'))
        ]);

        return new Content(
            view: 'emails.leave-application',
            with: [
                'applicantName' => $applicantName,
                'applicantEmail' => $applicantEmail,
                'designation' => $designation,
                'startDate' => $startDate,
                'endDate' => $endDate,
                'leaveType' => $leaveTypeName,
                'days' => $days,
                'reason' => $reason,
                'isSingleDay' => $isSingleDay,
                'approveUrl' => $approveUrl,
                'rejectUrl' => $rejectUrl,
                'teamLeadName' => "{$this->teamLead->first_name} {$this->teamLead->last_name}",
            ]
        );
    }
}
