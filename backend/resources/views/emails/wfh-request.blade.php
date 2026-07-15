<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WFH Request</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            padding: 30px;
            text-align: center;
            color: white;
        }
        .header h1 {
            font-size: 24px;
            margin-bottom: 10px;
            font-weight: 600;
        }
        .header p {
            font-size: 14px;
            opacity: 0.9;
        }
        .content {
            padding: 30px;
        }
        .greeting {
            font-size: 16px;
            margin-bottom: 20px;
            color: #333;
        }
        .application-form {
            background: #faf5ff;
            border-left: 4px solid #f5576c;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 15px;
        }
        .form-row.full {
            grid-template-columns: 1fr;
        }
        .form-field {
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 12px;
        }
        .form-field:last-child {
            border-bottom: none;
        }
        .form-label {
            font-size: 12px;
            color: #999;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 4px;
            display: block;
        }
        .form-value {
            font-size: 15px;
            color: #333;
            font-weight: 500;
        }
        .reason-box {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 12px;
            margin-top: 8px;
            font-style: italic;
            color: #666;
            font-size: 14px;
        }
        .action-section {
            margin: 30px 0;
            padding: 20px;
            background: #fff5f7;
            border-radius: 8px;
            text-align: center;
        }
        .action-title {
            font-size: 14px;
            color: #f5576c;
            font-weight: 600;
            text-transform: uppercase;
            margin-bottom: 15px;
        }
        .button-group {
            display: flex;
            gap: 12px;
            justify-content: center;
            flex-wrap: wrap;
        }
        .btn {
            display: inline-block;
            padding: 12px 28px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
        }
        .btn-approve {
            background: #10b981;
            color: white;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        .btn-approve:hover {
            background: #059669;
            box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
        }
        .btn-reject {
            background: #ef4444;
            color: white;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }
        .btn-reject:hover {
            background: #dc2626;
            box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
        }
        .reference-info {
            font-size: 12px;
            color: #999;
            margin-top: 15px;
            padding: 10px;
            background: white;
            border-radius: 4px;
            text-align: center;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #999;
            border-top: 1px solid #e0e0e0;
        }
        .footer-logo {
            font-size: 14px;
            font-weight: 600;
            color: #f5576c;
            margin-bottom: 10px;
        }
        .info-box {
            background: #e8f5e9;
            border-left: 4px solid #10b981;
            padding: 12px;
            border-radius: 4px;
            margin: 15px 0;
            font-size: 13px;
            color: #2e7d32;
        }
        @media (max-width: 600px) {
            .form-row {
                grid-template-columns: 1fr;
            }
            .button-group {
                flex-direction: column;
            }
            .btn {
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>🏠 Work From Home Request</h1>
            <p>Action Required: Please review and approve/reject</p>
        </div>

        <!-- Content -->
        <div class="content">
            <div class="greeting">
                Hello {{ $wfhRequest->user->teamLead?->first_name ?? 'Team Lead' }},
            </div>

            <p style="margin-bottom: 15px; color: #666;">
                <strong>{{ $wfhRequest->user->first_name }} {{ $wfhRequest->user->last_name }}</strong> has submitted a Work From Home request that requires your review.
            </p>

            <!-- Application Form -->
            <div class="application-form">
                <div class="form-row">
                    <div class="form-field">
                        <span class="form-label">Employee Name</span>
                        <div class="form-value">{{ $wfhRequest->user->first_name }} {{ $wfhRequest->user->last_name }}</div>
                    </div>
                    <div class="form-field">
                        <span class="form-label">Employee ID</span>
                        <div class="form-value">{{ $wfhRequest->user->employee_code }}</div>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-field">
                        <span class="form-label">Team</span>
                        <div class="form-value">{{ $wfhRequest->user->team?->name ?? 'N/A' }}</div>
                    </div>
                    <div class="form-field">
                        <span class="form-label">Designation</span>
                        <div class="form-value">{{ $wfhRequest->user->designation ?? 'N/A' }}</div>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-field">
                        <span class="form-label">WFH Date(s)</span>
                        <div class="form-value">
                            @if($wfhRequest->start_date->format('Y-m-d') === $wfhRequest->end_date->format('Y-m-d'))
                                {{ $wfhRequest->start_date->format('d M Y') }}
                            @else
                                {{ $wfhRequest->start_date->format('d M Y') }} - {{ $wfhRequest->end_date->format('d M Y') }}
                            @endif
                        </div>
                    </div>
                    <div class="form-field">
                        <span class="form-label">Applied On</span>
                        <div class="form-value">{{ $wfhRequest->created_at->format('d M Y, h:i A') }}</div>
                    </div>
                </div>

                <div class="form-row full">
                    <div class="form-field">
                        <span class="form-label">Reason</span>
                        <div class="reason-box">{{ $wfhRequest->reason ?? 'No reason provided' }}</div>
                    </div>
                </div>
            </div>

            <div class="info-box">
                ℹ️ WFH requests require approval from both Team Lead and HR. Please provide your feedback accordingly.
            </div>

            <!-- Action Section -->
            <div class="action-section">
                <div class="action-title">📋 Action Required</div>
                <p style="margin-bottom: 15px; font-size: 14px; color: #666;">
                    Please click one of the buttons below to review this request in the portal:
                </p>
                <div class="button-group">
                    <a href="{{ config('app.frontend_url') }}/approval/wfh/{{ $wfhRequest->id }}?action=approve" class="btn btn-approve">✓ Approve</a>
                    <a href="{{ config('app.frontend_url') }}/approval/wfh/{{ $wfhRequest->id }}?action=reject" class="btn btn-reject">✗ Reject</a>
                </div>
                <div class="reference-info">
                    Reference ID: <strong>#WFH{{ str_pad($wfhRequest->id, 6, '0', STR_PAD_LEFT) }}</strong>
                </div>
            </div>

            <p style="margin-top: 20px; font-size: 13px; color: #999; text-align: center;">
                ⚠️ Please note: Clicking the buttons above will redirect you to the Intersmart HR Portal where you must verify your identity before completing the approval/rejection.
            </p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-logo">🚀 Intersmart HR Portal</div>
            <p>Transforming HR Operations through Technology</p>
            <p style="margin-top: 10px;">Developed By Team QA</p>
            <p style="margin-top: 8px; color: #ccc;">© 2026 Intersmart. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
