@extends('emails.layout')
@section('title', 'Travel Allowance Request')
@section('body')
<p>Hi,</p>
<p><strong>{{ $taRequest->user->first_name }} {{ $taRequest->user->last_name }}</strong> ({{ $taRequest->user->employee_code }}, {{ $taRequest->user->designation ?? 'N/A' }}, {{ $taRequest->user->team->name ?? 'Unassigned' }}) has requested a travel allowance of <strong>₹{{ number_format($taRequest->total_amount, 2) }}</strong> and needs your approval.</p>

<table class="kv" role="presentation">
    <tr><td class="k">Travel date</td><td>{{ \Carbon\Carbon::parse($taRequest->date_travelled)->format('d M Y') }}</td></tr>
    <tr><td class="k">Applied on</td><td>{{ \Carbon\Carbon::parse($taRequest->created_at)->format('d M Y H:i') }}</td></tr>
    @if($taRequest->bill_link)
        <tr><td class="k">Bill / receipt</td><td><a href="{{ $taRequest->bill_link }}" target="_blank">View bill</a></td></tr>
    @endif
</table>

<p class="muted">Purpose of travel</p>
<div class="quote">{{ $taRequest->reason }}</div>

<table class="kv items" role="presentation">
    <tr><th>Category</th><th>Description</th><th class="r">Amount</th></tr>
    @foreach($taRequest->items as $item)
        <tr><td>{{ $item->category }}</td><td>{{ $item->description ?? '—' }}</td><td class="r">₹{{ number_format($item->amount, 2) }}</td></tr>
    @endforeach
    <tr><td colspan="2"><strong>Total</strong></td><td class="r"><strong>₹{{ number_format($taRequest->total_amount, 2) }}</strong></td></tr>
</table>

<p>
    <a href="{{ $data['approve_url'] }}" class="btn">Approve</a>
    <a href="{{ $data['reject_url'] }}" class="btn alt">Reject</a>
</p>
@endsection
