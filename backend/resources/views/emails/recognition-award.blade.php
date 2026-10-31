@extends('emails.layout')
@section('title', 'Employee Recognition')
@section('body')
<p>Hi {{ $data['employee_name'] }},</p>
<p>Congratulations! {{ $data['awarded_by'] }} has recognised you with <strong>{{ $data['icon'] ?? '⭐' }} {{ $data['title'] }}</strong>.</p>

@if($data['description'])
    <div class="quote">{{ $data['description'] }}</div>
@endif

<table class="kv" role="presentation">
    <tr><td class="k">Employee ID</td><td>{{ $data['employee_id'] }}</td></tr>
    @if($data['department'])<tr><td class="k">Department</td><td>{{ $data['department'] }}</td></tr>@endif
    @if($data['designation'])<tr><td class="k">Designation</td><td>{{ $data['designation'] }}</td></tr>@endif
    <tr><td class="k">Period</td><td>{{ $data['start_date'] }} — {{ $data['end_date'] }}</td></tr>
</table>

<p>Thank you for your continued work at Inter Smart.</p>
@endsection
