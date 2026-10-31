@extends('emails.layout')
@section('title', 'Leave Request')
@section('body')
<p>Hi,</p>
<p><strong>{{ $data['employee_name'] }}</strong> ({{ $data['employee_id'] }}, {{ $data['designation'] }}, {{ $data['department'] }}) has applied for leave and needs your review.</p>

<table class="kv" role="presentation">
    <tr><td class="k">Type</td><td>{{ $data['leave_type'] }}</td></tr>
    @if($data['is_single_day'])
        <tr><td class="k">Date</td><td>{{ \Carbon\Carbon::parse($data['start_date'])->format('d M Y (l)') }}</td></tr>
    @else
        <tr><td class="k">From</td><td>{{ \Carbon\Carbon::parse($data['start_date'])->format('d M Y (l)') }}</td></tr>
        <tr><td class="k">To</td><td>{{ \Carbon\Carbon::parse($data['end_date'])->format('d M Y (l)') }}</td></tr>
    @endif
    <tr><td class="k">Days</td><td>{{ $data['days'] }}</td></tr>
    <tr><td class="k">Applied on</td><td>{{ $data['applied_date'] }}</td></tr>
    <tr><td class="k">Reference</td><td>{{ $data['reference_number'] }}</td></tr>
</table>

<p class="muted">Reason</p>
<div class="quote">{{ $data['reason'] }}</div>

<p>Review it in the portal and approve or reject.</p>
<p>
    <a href="{{ $data['approvals_url'] }}?id={{ $data['request_id'] }}" class="btn">Review &amp; approve</a>
    <a href="{{ $data['approvals_url'] }}?id={{ $data['request_id'] }}" class="btn alt">Review &amp; reject</a>
</p>
@endsection
