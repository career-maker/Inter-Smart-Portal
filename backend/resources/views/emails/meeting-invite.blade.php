@php
    $cancelled = $verb === 'cancelled';
    $isLink = filled($meeting->location) && preg_match('#^https?://#i', trim($meeting->location));
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
        You are invited to a {{ $meeting->kind === 'client' ? 'client' : 'internal' }} meeting@if($meeting->organizer) organised by {{ $meeting->organizer->first_name }} {{ $meeting->organizer->last_name }}@endif. A calendar invite is attached; open it to add the meeting to your calendar.
    @endif
</p>

<table class="kv" role="presentation">
    <tr><td class="k">When</td><td>{{ str_replace(' IST', '', $when) }} &ndash; {{ $end }} IST</td></tr>
    <tr><td class="k">Where</td><td>@if($isLink)<a href="{{ trim($meeting->location) }}">{{ trim($meeting->location) }}</a>@else{{ $meeting->location ?: 'To be shared' }}@endif</td></tr>
    @if($meeting->agenda)
        <tr><td class="k">Agenda</td><td>{!! nl2br(e($meeting->agenda)) !!}</td></tr>
    @endif
</table>

@if($isLink && !$cancelled)
    <p><a href="{{ trim($meeting->location) }}" class="btn">Join meeting</a></p>
@endif
<p class="muted">Times are in India Standard Time (IST).</p>
@endsection
