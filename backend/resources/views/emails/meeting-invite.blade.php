<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meeting {{ $verb }}: {{ $meeting->title }}</title>
</head>
@php
    $cancelled = $verb === 'cancelled';
    $accent = $cancelled ? '#b91c1c' : '#1F5C4E';
    $isLink = filled($meeting->location) && preg_match('#^https?://#i', trim($meeting->location));
    $end = $meeting->ends_at->copy()->setTimezone('Asia/Kolkata')->format('H:i');
@endphp
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1e293b;line-height:1.6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:24px 12px;">
<tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="background-color:{{ $accent }};padding:28px 32px;color:#ffffff;">
            <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:0.85;">Meeting {{ $verb }}</div>
            <div style="font-size:22px;font-weight:700;margin-top:6px;{{ $cancelled ? 'text-decoration:line-through;' : '' }}">{{ $meeting->title }}</div>
            <div style="font-size:13px;opacity:0.9;margin-top:4px;">{{ $meeting->kind === 'client' ? 'Client meeting' : 'Internal meeting' }}@if($meeting->organizer) &middot; Organised by {{ $meeting->organizer->first_name }} {{ $meeting->organizer->last_name }}@endif</div>
        </td></tr>

        <tr><td style="padding:28px 32px 8px 32px;">
            @if($cancelled)
                <p style="margin:0 0 18px 0;font-size:14px;">This meeting has been cancelled. Please remove it from your calendar.</p>
            @else
                <p style="margin:0 0 18px 0;font-size:14px;">You are invited. A calendar invite is attached; open it to add this meeting to your calendar.</p>
            @endif
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;">
                <tr>
                    <td style="padding:12px 16px;width:90px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:1px solid #f1f5f9;">When</td>
                    <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#0f172a;border-bottom:1px solid #f1f5f9;">{{ str_replace(' IST', '', $when) }} &ndash; {{ $end }} IST</td>
                </tr>
                <tr>
                    <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;{{ $meeting->agenda ? 'border-bottom:1px solid #f1f5f9;' : '' }}">Where</td>
                    <td style="padding:12px 16px;font-size:14px;color:#0f172a;{{ $meeting->agenda ? 'border-bottom:1px solid #f1f5f9;' : '' }}">
                        @if($isLink)
                            <a href="{{ trim($meeting->location) }}" style="color:{{ $accent }};font-weight:600;">{{ trim($meeting->location) }}</a>
                        @else
                            {{ $meeting->location ?: 'To be shared' }}
                        @endif
                    </td>
                </tr>
                @if($meeting->agenda)
                <tr>
                    <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;vertical-align:top;">Agenda</td>
                    <td style="padding:12px 16px;font-size:14px;color:#0f172a;">{!! nl2br(e($meeting->agenda)) !!}</td>
                </tr>
                @endif
            </table>

            @if($isLink && !$cancelled)
            <div style="text-align:center;margin:26px 0 8px 0;">
                <a href="{{ trim($meeting->location) }}" style="display:inline-block;background-color:{{ $accent }};color:#ffffff;text-decoration:none;padding:12px 30px;border-radius:8px;font-weight:700;font-size:14px;">Join meeting</a>
            </div>
            @endif
        </td></tr>

        <tr><td style="padding:20px 32px 28px 32px;font-size:13px;color:#64748b;">
            Times are shown in India Standard Time (IST).
        </td></tr>
        <tr><td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;font-size:11px;color:#94a3b8;">
            &copy; {{ date('Y') }} Inter Smart Portal. This is an automated message.
        </td></tr>
    </table>
</td></tr>
</table>
</body>
</html>
