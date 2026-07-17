<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recognition Award</title>
    <style type="text/css">
        * { margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; }
        .email-container { width: 100%; max-width: 100%; margin: 0; background-color: #ffffff; }

        /* Header */
        .header {
            background-color: #ffffff;
            border-bottom: 1px solid #e5e7eb;
            padding: 40px 20px;
            text-align: center;
        }
        .logo { font-size: 24px; font-weight: 700; color: #1f2937; margin-bottom: 10px; }
        .header-title { font-size: 28px; font-weight: 600; color: #1f2937; margin: 20px 0 0 0; }

        /* Content */
        .content { padding: 40px 20px; }
        .content-wrapper { max-width: 800px; margin: 0 auto; }

        .congrats-text {
            font-size: 16px;
            color: #4b5563;
            line-height: 1.8;
            margin-bottom: 30px;
            text-align: center;
        }
        .congrats-text strong { color: #1f2937; font-weight: 600; }

        /* Award Box */
        .award-box {
            background-color: #f3f4f6;
            border-left: 4px solid #3b82f6;
            padding: 25px;
            margin: 30px 0;
            border-radius: 4px;
        }

        .award-header {
            font-size: 14px;
            font-weight: 600;
            color: #3b82f6;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        .award-value {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
        }
        .award-subtext {
            font-size: 14px;
            color: #6b7280;
        }

        /* Details Section */
        .details-grid {
            display: table;
            width: 100%;
            margin: 30px 0;
        }
        .detail-item {
            display: table-row;
        }
        .detail-label {
            display: table-cell;
            width: 35%;
            padding: 12px 0;
            font-size: 13px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            border-bottom: 1px solid #e5e7eb;
        }
        .detail-value {
            display: table-cell;
            padding: 12px 0 12px 20px;
            font-size: 14px;
            color: #1f2937;
            border-bottom: 1px solid #e5e7eb;
        }

        /* Message Box */
        .message-box {
            background-color: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 20px;
            margin: 30px 0;
            border-radius: 4px;
        }
        .message-title {
            font-size: 14px;
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 10px;
        }
        .message-text {
            font-size: 14px;
            color: #1e40af;
            line-height: 1.6;
        }

        /* Footer */
        .footer {
            background-color: #f9fafb;
            border-top: 1px solid #e5e7eb;
            padding: 30px 20px;
            text-align: center;
            font-size: 13px;
            color: #6b7280;
        }
        .footer-message {
            margin-bottom: 15px;
            line-height: 1.6;
        }
        .footer-credit {
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #9ca3af;
        }

        /* Responsive */
        @media (max-width: 600px) {
            .header { padding: 30px 15px; }
            .header-title { font-size: 24px; }
            .content { padding: 30px 15px; }
            .detail-label, .detail-value { display: block; width: auto; padding: 10px 0 10px 0; }
            .detail-value { padding-left: 0; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <div class="logo">Inter Smart</div>
            <h1 class="header-title">Employee Recognition</h1>
        </div>

        <!-- Content -->
        <div class="content">
            <div class="content-wrapper">
                <!-- Congratulations Message -->
                <div class="congrats-text">
                    Congratulations <strong>{{ $data['employee_name'] }}</strong>!<br>
                    You have been recognized for <strong>"{{ $data['title'] }}"</strong><br>
                    by <strong>{{ $data['awarded_by'] }}</strong>
                </div>

                <!-- Award Details -->
                <div class="award-box">
                    <div class="award-header">Award</div>
                    <div class="award-value">{{ $data['title'] }}</div>
                    <div class="award-subtext">{{ $data['icon'] ?? '⭐' }} Recognition awarded</div>
                </div>

                <!-- Details -->
                <div class="details-grid">
                    <div class="detail-item">
                        <div class="detail-label">Employee</div>
                        <div class="detail-value">{{ $data['employee_name'] }}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Employee ID</div>
                        <div class="detail-value">{{ $data['employee_id'] }}</div>
                    </div>
                    @if($data['department'])
                    <div class="detail-item">
                        <div class="detail-label">Department</div>
                        <div class="detail-value">{{ $data['department'] }}</div>
                    </div>
                    @endif
                    @if($data['designation'])
                    <div class="detail-item">
                        <div class="detail-label">Designation</div>
                        <div class="detail-value">{{ $data['designation'] }}</div>
                    </div>
                    @endif
                    <div class="detail-item">
                        <div class="detail-label">Period</div>
                        <div class="detail-value">{{ $data['start_date'] }} — {{ $data['end_date'] }}</div>
                    </div>
                </div>

                <!-- Description -->
                @if($data['description'])
                <div>
                    <div class="award-header" style="margin-top: 25px;">Recognition Details</div>
                    <div style="font-size: 14px; color: #4b5563; line-height: 1.8; margin-top: 12px; padding: 15px; background-color: #f9fafb; border-radius: 4px;">
                        {{ $data['description'] }}
                    </div>
                </div>
                @endif

                <!-- Message -->
                <div class="message-box">
                    <div class="message-title">Your Achievement</div>
                    <div class="message-text">
                        This recognition reflects your outstanding performance and dedication. Your contributions are valued and appreciated by the organization.
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-message">
                <strong>Thank you</strong> for your continued excellence and commitment to Inter Smart.
            </div>
            <div class="footer-credit">
                © {{ date('Y') }} Inter Smart. All rights reserved. | Developed By Team QA
            </div>
        </div>
    </div>
</body>
</html>
