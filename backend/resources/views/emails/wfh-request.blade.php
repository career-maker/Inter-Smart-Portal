<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WFH Request</title>
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
        .header-subtitle { font-size: 14px; color: #6b7280; margin-top: 8px; }

        /* Content */
        .content { padding: 40px 20px; }
        .content-wrapper { max-width: 800px; margin: 0 auto; }

        /* Status Box */
        .status-box {
            background-color: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 20px;
            margin-bottom: 30px;
            border-radius: 4px;
            text-align: center;
        }
        .status-title { font-size: 13px; font-weight: 600; color: #1e40af; text-transform: uppercase; }
        .status-text { font-size: 14px; color: #1e40af; margin-top: 5px; }

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

        /* Reason Box */
        .reason-box {
            background-color: #f9fafb;
            padding: 15px;
            border-radius: 4px;
            margin: 30px 0;
            border-left: 4px solid #3b82f6;
        }
        .reason-label { font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 8px; }
        .reason-text { font-size: 14px; color: #4b5563; line-height: 1.6; }

        /* Action Box */
        .action-box {
            background-color: #f0fdf4;
            border-left: 4px solid #10b981;
            padding: 20px;
            margin: 30px 0;
            border-radius: 4px;
        }
        .action-title { font-size: 13px; font-weight: 600; color: #065f46; text-transform: uppercase; }
        .action-text { font-size: 14px; color: #065f46; margin-top: 5px; }

        /* Button */
        .button-group {
            margin: 30px 0;
            text-align: center;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
            border-radius: 4px;
            background-color: #10b981;
            color: white;
            transition: all 0.3s ease;
        }
        .button:hover {
            background-color: #059669;
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
            .button { display: block; width: 100%; }
            .detail-label, .detail-value { display: block; width: auto; padding: 10px 0; }
            .detail-value { padding-left: 0; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <div class="logo">Intersmart</div>
            <h1 class="header-title">Work From Home Request</h1>
            <p class="header-subtitle">Awaiting Your Action</p>
        </div>

        <!-- Content -->
        <div class="content">
            <div class="content-wrapper">
                <!-- Status -->
                <div class="status-box">
                    <div class="status-title">Status: Pending Approval</div>
                    <div class="status-text">A WFH request requires your review and response</div>
                </div>

                <!-- Employee Details -->
                <div>
                    <div style="font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 15px;">Employee Information</div>
                    <div class="details-grid">
                        <div class="detail-item">
                            <div class="detail-label">Name</div>
                            <div class="detail-value">{{ $data['employee_name'] }}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Employee ID</div>
                            <div class="detail-value">{{ $data['employee_id'] }}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Department</div>
                            <div class="detail-value">{{ $data['department'] }}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Designation</div>
                            <div class="detail-value">{{ $data['designation'] }}</div>
                        </div>
                    </div>
                </div>

                <!-- WFH Details -->
                <div style="margin-top: 30px;">
                    <div style="font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 15px;">WFH Details</div>
                    <div class="details-grid">
                        <div class="detail-item">
                            <div class="detail-label">Duration</div>
                            <div class="detail-value">{{ $data['duration_type'] ?? 'Full Day' }}</div>
                        </div>
                        @if($data['is_single_day'])
                            <div class="detail-item">
                                <div class="detail-label">Date</div>
                                <div class="detail-value">{{ \Carbon\Carbon::parse($data['start_date'])->format('d M Y (l)') }}</div>
                            </div>
                        @else
                            <div class="detail-item">
                                <div class="detail-label">From</div>
                                <div class="detail-value">{{ \Carbon\Carbon::parse($data['start_date'])->format('d M Y (l)') }}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">To</div>
                                <div class="detail-value">{{ \Carbon\Carbon::parse($data['end_date'])->format('d M Y (l)') }}</div>
                            </div>
                        @endif
                        <div class="detail-item">
                            <div class="detail-label">Applied On</div>
                            <div class="detail-value">{{ $data['applied_date'] }}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Reference</div>
                            <div class="detail-value" style="font-family: monospace; font-size: 12px;">{{ $data['reference_number'] }}</div>
                        </div>
                    </div>
                </div>

                <!-- Reason -->
                <div class="reason-box">
                    <div class="reason-label">Reason for WFH</div>
                    <div class="reason-text">{{ $data['reason'] }}</div>
                </div>

                <!-- Action -->
                <div class="action-box">
                    <div class="action-title">Next Steps</div>
                    <div class="action-text">Please review the WFH request and respond from the HR Portal.</div>
                </div>

                <!-- Action Button -->
                <div class="button-group">
                    <a href="{{ $data['approvals_url'] }}?id={{ $data['request_id'] }}" class="button">✓ Review & Respond</a>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-message">
                <strong>Intersmart HR Portal</strong><br>
                This is an automated email. Please do not reply directly to this message.
            </div>
            <div class="footer-credit">
                © {{ date('Y') }} Intersmart. All rights reserved. | Developed By Team QA
            </div>
        </div>
    </div>
</body>
</html>
