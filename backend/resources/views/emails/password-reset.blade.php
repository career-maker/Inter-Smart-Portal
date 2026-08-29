<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Reset Your Password - Inter Smart Workplace</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #0f172a;
            color: #f8fafc;
        }
        .wrapper {
            width: 100%;
            background-color: #0f172a;
            padding: 40px 0;
        }
        .container {
            max-width: 560px;
            margin: 0 auto;
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
        }
        .header {
            background: linear-gradient(135deg, #56348f 0%, #3b1e6d 100%);
            padding: 30px 40px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            color: #ffffff;
            font-size: 22px;
            font-weight: 800;
            letter-spacing: 0.5px;
        }
        .header p {
            margin: 6px 0 0 0;
            color: #e2d9f3;
            font-size: 12px;
            letter-spacing: 1px;
            text-transform: uppercase;
        }
        .body {
            padding: 36px 40px;
            color: #cbd5e1;
            font-size: 14px;
            line-height: 1.6;
        }
        .greeting {
            font-size: 16px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 16px;
        }
        .btn-container {
            text-align: center;
            margin: 32px 0;
        }
        .btn {
            display: inline-block;
            background: #56348f;
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 10px;
            font-weight: 700;
            font-size: 14px;
            letter-spacing: 0.3px;
            box-shadow: 0 4px 14px rgba(86, 52, 143, 0.4);
        }
        .btn:hover {
            background: #462875;
        }
        .meta-box {
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 10px;
            padding: 16px;
            margin: 24px 0;
            font-size: 12px;
            color: #94a3b8;
        }
        .meta-box strong {
            color: #f1f5f9;
        }
        .url-box {
            word-break: break-all;
            font-size: 11px;
            color: #94a3b8;
            background: #0f172a;
            padding: 12px;
            border-radius: 8px;
            border: 1px dashed #334155;
            margin-top: 20px;
        }
        .footer {
            background: #0f172a;
            border-top: 1px solid #334155;
            padding: 20px 40px;
            text-align: center;
            font-size: 11px;
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h1>INTER SMART</h1>
                <p>Workplace Portal • Security</p>
            </div>

            <div class="body">
                <div class="greeting">Hello {{ $user->first_name }},</div>
                <p>We received a request to reset the password for your Inter Smart Employee Portal account (<strong>{{ $user->email }}</strong>).</p>
                <p>Click the button below to choose a new password. For security reasons, this link will expire in <strong>60 minutes</strong>.</p>

                <div class="btn-container">
                    <a href="{{ $resetUrl }}" class="btn">Reset My Password</a>
                </div>

                <div class="meta-box">
                    <strong>Security Notice:</strong> If you did not request a password reset, please ignore this email or notify your system administrator immediately. Your password will remain unchanged.
                </div>

                <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">
                    If the button above does not work, copy and paste this URL directly into your browser:
                </p>
                <div class="url-box">
                    <a href="{{ $resetUrl }}" style="color: #a855f7;">{{ $resetUrl }}</a>
                </div>
            </div>

            <div class="footer">
                &copy; {{ date('Y') }} Inter Smart. All rights reserved.<br>
                This is an automated system notification from the Inter Smart Workplace Portal.
            </div>
        </div>
    </div>
</body>
</html>
