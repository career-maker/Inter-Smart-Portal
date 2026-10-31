@extends('emails.layout')
@section('title', 'Travel Allowance Approved')
@section('body')
<p>Hi {{ $data['employee_name'] ?? ($taRequest->user->first_name . ' ' . $taRequest->user->last_name) }},</p>
<p>Your travel allowance claim{{ !empty($taRequest->receipt_number) ? ' (receipt ' . $taRequest->receipt_number . ')' : '' }} has been approved for <strong>₹{{ number_format((float)($taRequest->approved_amount ?? $taRequest->total_amount), 2) }}</strong>.@if($taRequest->is_paid) The payment has been disbursed.@endif</p>

<table class="kv" role="presentation">
    <tr><td class="k">Travel date</td><td>{{ \Carbon\Carbon::parse($taRequest->date_travelled)->format('d M Y') }}</td></tr>
    <tr><td class="k">Purpose</td><td>{{ $taRequest->reason }}</td></tr>
    @if(!empty($taRequest->approval_notes))
        <tr><td class="k">Remark</td><td>{{ $taRequest->approval_notes }}</td></tr>
    @endif
    @if(!empty($taRequest->payment_receipt_link))
        <tr><td class="k">Payment proof</td><td><a href="{{ $taRequest->payment_receipt_link }}" target="_blank">View voucher</a></td></tr>
    @endif
</table>

@if($taRequest->items && count($taRequest->items) > 0)
<table class="kv items" role="presentation">
    <tr><th>Category</th><th>Description</th><th class="r">Amount</th></tr>
    @foreach($taRequest->items as $item)
        <tr><td>{{ $item->category }}</td><td>{{ $item->description ?: '–' }}</td><td class="r">₹{{ number_format((float)$item->amount, 2) }}</td></tr>
    @endforeach
</table>
@endif

<p><a href="{{ config('app.frontend_url', 'https://www.workplace.intersmart.in') }}/ta/status" class="btn">View claim status</a></p>
@endsection
