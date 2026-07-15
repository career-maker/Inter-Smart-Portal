<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Leave Request</title>
    <style type="text/css">
        * { margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: #f8f9fa; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { font-size: 24px; margin: 0; font-weight: 600; }
        .header p { font-size: 14px; margin-top: 5px; opacity: 0.9; }
        .content { background: white; padding: 30px 20px; margin: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .section-title { font-size: 14px; font-weight: 600; color: #667eea; margin-top: 25px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px; }
        .detail-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .detail-table tr { border-bottom: 1px solid #eee; }
        .detail-table td { padding: 12px 0; font-size: 14px; }
        .detail-table td:first-child { font-weight: 600; color: #666; width: 40%; }
        .detail-table td:last-child { color: #333; }
        .status-box { background: #f0f7ff; border-left: 4px solid #667eea; padding: 15px; border-radius: 4px; margin: 20px 0; font-size: 14px; }
        .status-box strong { color: #667eea; }
        .button-group { margin: 30px 0; text-align: center; }
        .button { display: inline-block; padding: 12px 30px; margin: 0 10px 10px 0; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px; transition: all 0.3s ease; }
        .button-approve { background: #10b981; color: white; }
        .button-approve:hover { background: #059669; text-decoration: none; }
        .button-reject { background: #ef4444; color: white; }
        .button-reject:hover { background: #dc2626; text-decoration: none; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
        .footer p { margin: 5px 0; }
        .logo { margin-bottom: 20px; }
        .logo-text { font-size: 18px; font-weight: 700; color: white; }
        .info-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 15px 0; font-size: 13px; }
        @media (max-width: 600px) {
            .container { width: 100%; }
            .content { padding: 20px; margin: 10px; }
            .button-group { text-align: center; }
            .button { display: block; width: 100%; margin: 10px 0; text-align: center; }
            .detail-table td { padding: 10px 0; font-size: 13px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="logo">
                <div class="logo-text">Intersmart</div>
                <p style="font-size: 12px; margin-top: 5px; opacity: 0.8;">HR Portal</p>
            </div>
            <h1>New Leave Request</h1>
            <p>Action Required</p>
        </div>

        <!-- Content -->
        <div class="content">
            <!-- Status -->
            <div class="status-box">
                <strong>Status:</strong> Awaiting Your Approval
            </div>

            <!-- Employee Details -->
            <div class="section-title">Employee Information</div>
            <table class="detail-table">
                <tr>
                    <td>Name</td>
                    <td>{{ $data['employee_name'] }}</td>
                </tr>
                <tr>
                    <td>Employee ID</td>
                    <td>{{ $data['employee_id'] }}</td>
                </tr>
                <tr>
                    <td>Department</td>
                    <td>{{ $data['department'] }}</td>
                </tr>
                <tr>
                    <td>Designation</td>
                    <td>{{ $data['designation'] }}</td>
                </tr>
            </table>

            <!-- Leave Details -->
            <div class="section-title">Leave Details</div>
            <table class="detail-table">
                <tr>
                    <td>Leave Type</td>
                    <td><strong>{{ $data['leave_type'] }}</strong></td>
                </tr>
                @if($data['is_single_day'])
                    <tr>
                        <td>Date</td>
                        <td>{{ \Carbon\Carbon::parse($data['start_date'])->format('d M Y (l)') }}</td>
                    </tr>
                @else
                    <tr>
                        <td>Start Date</td>
                        <td>{{ \Carbon\Carbon::parse($data['start_date'])->format('d M Y (l)') }}</td>
                    </tr>
                    <tr>
                        <td>End Date</td>
                        <td>{{ \Carbon\Carbon::parse($data['end_date'])->format('d M Y (l)') }}</td>
                    </tr>
                @endif
                <tr>
                    <td>Number of Days</td>
                    <td><strong>{{ $data['days'] }}</strong></td>
                </tr>
            </table>

            <!-- Reason -->
            <div class="section-title">Reason</div>
            <p style="background: #f9fafb; padding: 15px; border-radius: 4px; font-size: 14px; line-height: 1.6; color: #555;">
                {{ $data['reason'] }}
            </p>

            <!-- Additional Info -->
            <table class="detail-table">
                <tr>
                    <td>Applied On</td>
                    <td>{{ $data['applied_date'] }}</td>
                </tr>
                <tr>
                    <td>Reference #</td>
                    <td><code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px;">{{ $data['reference_number'] }}</code></td>
                </tr>
            </table>

            <!-- Action Info -->
            <div class="info-box">
                <strong>ℹ️ Next Steps:</strong> Please review the request and approve or reject it from the HR Portal. Click the buttons below to proceed.
            </div>

            <!-- Action Buttons -->
            <div class="button-group">
                <a href="{{ $data['approvals_url'] }}?id={{ $data['request_id'] }}" class="button button-approve" style="color: white;">✓ Review & Approve</a>
                <a href="{{ $data['approvals_url'] }}?id={{ $data['request_id'] }}" class="button button-reject" style="color: white;">✗ Review & Reject</a>
            </div>

            <!-- Portal Link -->
            <p style="text-align: center; margin-top: 20px; font-size: 13px; color: #666;">
                <a href="{{ $data['portal_url'] }}" style="color: #667eea; text-decoration: none;">Open HR Portal</a>
            </p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p><strong>Intersmart HR Portal</strong></p>
            <p>This is an automated email. Please do not reply directly.</p>
            <p style="margin-top: 15px; color: #999; font-size: 11px;">
                © {{ date('Y') }} Intersmart. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
