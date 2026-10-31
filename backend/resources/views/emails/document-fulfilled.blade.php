@extends('emails.layout')
@section('title', 'Document Ready')
@section('body')
<p>Hi {{ $employeeName }},</p>
<p>The document you requested has been prepared by HR and is ready.</p>

<table class="kv" role="presentation">
    <tr><td class="k">Request no.</td><td>{{ $requestNumber }}</td></tr>
    <tr><td class="k">Subject</td><td>{{ $subject }}</td></tr>
    @if($description)
        <tr><td class="k">Details</td><td>{{ $description }}</td></tr>
    @endif
</table>

@if($comments)
    <p class="muted">Note from HR</p>
    <div class="quote">{{ $comments }}</div>
@endif

<p>
    @if($fileUrl)<a href="{{ $fileUrl }}" class="btn" target="_blank">Download document</a>@endif
    @if($documentUrl)<a href="{{ $documentUrl }}" class="btn alt" target="_blank">Open shared link</a>@endif
    <a href="{{ $portalUrl }}" class="btn alt" target="_blank">View on portal</a>
</p>
@if($fileUrl)<p class="muted">The file is also attached to this email.</p>@endif
@endsection
