@extends('emails.layout')
@section('title', 'Leave Application')
@section('body')
<p>Hi {{ $teamLeadName }},</p>
<p><strong>{{ $applicantName }}</strong> ({{ $designation }}, {{ $applicantEmail }}) has submitted a leave application.
    @if($isSingleDay)
        It is a single-day leave, so your decision is final.
    @else
        It is a multi-day leave, so HR approval is also needed after yours.
    @endif
</p>

<table class="kv" role="presentation">
    <tr><td class="k">Type</td><td>{{ $leaveType }}</td></tr>
    <tr><td class="k">Start</td><td>{{ $startDate }}</td></tr>
    <tr><td class="k">End</td><td>{{ $endDate }}</td></tr>
    <tr><td class="k">Days</td><td>{{ $days }}</td></tr>
</table>

<p class="muted">Reason</p>
<div class="quote">{{ $reason }}</div>

<p>
    <a href="{{ $approveUrl }}" class="btn">Approve</a>
    <a href="{{ $rejectUrl }}" class="btn alt">Reject</a>
</p>
<p class="muted">You can also decide from the portal. Email and portal actions stay in sync.</p>
@endsection
