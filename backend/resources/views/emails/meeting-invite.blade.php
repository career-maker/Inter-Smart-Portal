@php
    $cancelled = $verb === 'cancelled';
    $isLink = filled($meeting->location) && preg_match('#^https?://#i', trim($meeting->location));
    $gcal = 'https://calendar.google.com/calendar/render?' . http_build_query(['action' => 'TEMPLATE', 'text' => $meeting->title, 'dates' => $meeting->starts_at->copy()->utc()->format('Ymd\THis\Z') . '/' . $meeting->ends_at->copy()->utc()->format('Ymd\THis\Z'), 'details' => trim(($meeting->agenda ?: '') . ($isLink ? "

Join: " . trim($meeting->location) : '')), 'location' => (string) $meeting->location]);
    $ocal = 'https://outlook.live.com/calendar/0/deeplink/compose?' . http_build_query(['path' => '/calendar/action/compose', 'rru' => 'addevent', 'subject' => $meeting->title, 'startdt' => $meeting->starts_at->copy()->utc()->format('Y-m-d\TH:i:s\Z'), 'enddt' => $meeting->ends_at->copy()->utc()->format('Y-m-d\TH:i:s\Z'), 'body' => (string) $meeting->agenda, 'location' => (string) $meeting->location]);
    $end = $meeting->ends_at->copy()->setTimezone('Asia/Kolkata')->format('H:i');
@endphp
@extends('emails.layout')
@section('title', 'Meeting ' . $verb . ': ' . $meeting->title)
@section('body')
<p class="muted">Meeting {{ $verb }}</p>
<h1 @if($cancelled) style="text-decoration:line-through;" @endif>{{ $meeting->title }}</h1>
<p>
    @if($cancelled)
        This meeting has been cancelled. Please remove it from your calendar.
    @else
        You are invited to a {{ $meeting->kind === 'client' ? 'client' : 'internal' }} meeting{{ $meeting->organizer ? ' organised by ' . $meeting->organizer->first_name . ' ' . $meeting->organizer->last_name : '' }}. A calendar invite is attached; open it to add the meeting to your calendar.
    @endif
</p>

<table class="kv" role="presentation">
    <tr><td class="k">When</td><td>{{ str_replace(' IST', '', $when) }} &ndash; {{ $end }} IST</td></tr>
    <tr><td class="k">Where</td><td>@if($isLink)<a href="{{ trim($meeting->location) }}">{{ trim($meeting->location) }}</a>@else{{ $meeting->location ?: 'To be shared' }}@endif</td></tr>
    @if($meeting->agenda)
        <tr><td class="k">Agenda</td><td>{!! nl2br(e($meeting->agenda)) !!}</td></tr>
    @endif
</table>

@if(!$cancelled)
    <p>
        @if($isLink)<a href="{{ trim($meeting->location) }}" class="btn">Join meeting</a>@endif
        <a href="{{ $gcal }}" class="btn alt" target="_blank">Add to Google Calendar</a>
        <a href="{{ $ocal }}" class="btn alt" target="_blank">Add to Outlook</a>
    </p>
@endif
<p class="muted">Times are in India Standard Time (IST).</p>
@endsection
