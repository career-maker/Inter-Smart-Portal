@extends('emails.layout')
@section('title', $data['headline'] ?? 'New Update in Workplace Community')
@section('body')
<p class="muted">{{ $data['type_badge'] ?? 'Community' }}</p>
<h1>{{ $data['headline'] ?? 'New Update in Workplace Community' }}</h1>
<p class="muted">{{ $data['author_name'] }}, {{ $data['author_designation'] }} &middot; {{ $data['created_at'] }}</p>

@if(!empty($data['badge']))
    <p><strong>{{ $data['badge'] }}</strong>@if(!empty($data['praised_names'])) &middot; Praised: {{ $data['praised_names'] }}@endif</p>
@endif

<div class="quote">{{ $data['content'] }}</div>

@if(!empty($data['poll_options']) && is_array($data['poll_options']))
    <p class="muted">Poll options</p>
    <ul>
        @foreach($data['poll_options'] as $option)
            <li>{{ is_array($option) ? ($option['text'] ?? '') : $option }}</li>
        @endforeach
    </ul>
@endif

<p><a href="{{ $data['action_url'] }}" class="btn">View in community</a></p>
@endsection
