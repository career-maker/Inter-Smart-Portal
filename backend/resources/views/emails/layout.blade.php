@php $fe = rtrim(config('app.frontend_url'), '/'); @endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>@yield('title')</title>
    <style type="text/css">
        body { margin: 0; padding: 0; background: #ffffff; color: #1f2328; font: 15px/1.6 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
        .wrap { max-width: 560px; margin: 0 auto; padding: 32px 20px; background: #ffffff; }
        h1 { margin: 0 0 16px; font-size: 20px; line-height: 1.3; font-weight: 700; }
        p { margin: 0 0 16px; }
        a { color: #1a56db; }
        .quote { margin: 0 0 20px; padding: 2px 0 2px 16px; border-left: 3px solid #d0d7de; color: #57606a; white-space: pre-line; }
        .kv { width: 100%; border-collapse: collapse; margin: 0 0 20px; }
        .kv td, .kv th { padding: 5px 0; vertical-align: top; font-size: 14px; text-align: left; }
        .kv td.k { width: 130px; padding-right: 12px; color: #6e7781; }
        .items td, .items th { padding: 8px 0; border-bottom: 1px solid #d8dee4; }
        .items th { font-size: 12px; font-weight: 600; color: #6e7781; }
        .items .r, .kv .r { text-align: right; }
        .btn { display: inline-block; margin: 0 8px 8px 0; padding: 10px 18px; background: #111111; color: #ffffff !important; border: 1px solid #111111; border-radius: 6px; font-size: 14px; font-weight: 600; text-decoration: none; }
        .btn.alt { background: #ffffff; color: #111111 !important; border-color: #d0d7de; }
        .logo { display: block; height: 36px; width: auto; border: 0; }
        .logo-night { display: none; }
        .brand { margin: 0 0 24px; padding-bottom: 16px; border-bottom: 1px solid #d8dee4; }
        .brand-name { margin: 8px 0 0; font-size: 13px; font-weight: 600; color: #57606a; }
        .links a { margin-right: 14px; }
        .muted { color: #6e7781; font-size: 13px; }
        .foot { margin-top: 32px; padding-top: 16px; border-top: 1px solid #d8dee4; }
        @media (prefers-color-scheme: dark) {
            .logo-day { display: none !important; }
            .logo-night { display: block !important; }
            .brand, .brand-name { border-color: #30363d; color: #8b949e; }
            body, .wrap { background: #0d1117 !important; color: #e6edf3 !important; }
            a { color: #79b8ff; }
            .quote { border-color: #3d444d; color: #9da7b3; }
            .kv td.k, .items th, .muted { color: #8b949e !important; }
            .items td, .items th, .foot { border-color: #30363d; }
            .btn { background: #e6edf3; color: #0d1117 !important; border-color: #e6edf3; }
            .btn.alt { background: transparent; color: #e6edf3 !important; border-color: #3d444d; }
        }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="brand">
            <a href="{{ $fe }}"><img class="logo logo-day" src="{{ $fe }}/logo-dark.png" alt="Inter Smart"></a>
            <a href="{{ $fe }}"><img class="logo logo-night" src="{{ $fe }}/logo.png" alt="Inter Smart"></a>
            <div class="brand-name">Inter Smart Employee Portal</div>
        </div>
        @yield('body')
        <p style="margin-top: 28px;">Wishing you a productive and wonderful day ahead.<br>Team Inter Smart</p>
        <div class="foot muted">
            <div class="links">
                <a href="{{ $fe }}/dashboard">Dashboard</a>
                <a href="{{ $fe }}/leaves">Leaves</a>
                <a href="{{ $fe }}/calendar">Calendar</a>
                <a href="{{ $fe }}/policies">Policies</a>
            </div>
            <div style="margin-top: 10px;">Inter Smart Employee Portal &middot; Automated message, please do not reply.</div>
        </div>
    </div>
</body>
</html>
