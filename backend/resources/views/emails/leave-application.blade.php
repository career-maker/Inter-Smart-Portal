<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            color: #333;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            border-bottom: 2px solid #007bff;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .header h2 {
            margin: 0;
            color: #007bff;
        }
        .details {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .detail-label {
            font-weight: bold;
            color: #555;
        }
        .detail-value {
            color: #333;
        }
        .actions {
            margin: 30px 0;
            padding: 20px 0;
            border-top: 2px solid #e0e0e0;
            border-bottom: 2px solid #e0e0e0;
        }
        .action-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin-top: 20px;
        }
        .btn {
            padding: 12px 30px;
            border-radius: 5px;
            text-decoration: none;
            font-weight: bold;
            font-size: 16px;
            display: inline-block;
        }
        .btn-approve {
            background-color: #28a745;
            color: white;
        }
        .btn-approve:hover {
            background-color: #218838;
        }
        .btn-reject {
            background-color: #dc3545;
            color: white;
        }
        .btn-reject:hover {
            background-color: #c82333;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #999;
            text-align: center;
        }
        .note {
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            color: #856404;
            padding: 12px;
            border-radius: 5px;
            margin-top: 20px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Leave Application Notification</h2>
        </div>

        <p>Dear {{ $teamLeadName }},</p>

        <p>A new leave application has been submitted and requires your attention. Please review the details below:</p>

        <div class="details">
            <div class="detail-row">
                <span class="detail-label">Applicant Name:</span>
                <span class="detail-value">{{ $applicantName }}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Email:</span>
                <span class="detail-value">{{ $applicantEmail }}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Designation:</span>
                <span class="detail-value">{{ $designation }}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Leave Type:</span>
                <span class="detail-value">{{ $leaveType }}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Start Date:</span>
                <span class="detail-value">{{ $startDate }}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">End Date:</span>
                <span class="detail-value">{{ $endDate }}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Number of Days:</span>
                <span class="detail-value">{{ $days }}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Reason:</span>
                <span class="detail-value">{{ $reason }}</span>
            </div>
        </div>

        <div class="actions">
            <h3 style="text-align: center; color: #007bff;">Action Required</h3>
            @if ($isSingleDay)
                <p style="text-align: center; color: #666; margin-bottom: 20px;">
                    This is a single-day leave application. Please review and approve or reject:
                </p>
            @else
                <p style="text-align: center; color: #666; margin-bottom: 20px;">
                    This is a multi-day leave application. HR approval will also be required after your approval:
                </p>
            @endif

            <div class="action-buttons">
                <a href="{{ $approveUrl }}" class="btn btn-approve">✓ Approve</a>
                <a href="{{ $rejectUrl }}" class="btn btn-reject">✕ Reject</a>
            </div>
        </div>

        <div class="note">
            <strong>Note:</strong> You can also approve or reject this leave request directly from the company portal. Actions taken via email or portal will be synchronized.
        </div>

        <div class="footer">
            <p>This is an automated notification from Inter Smart Employee Portal.</p>
            <p>Please do not reply to this email. Contact your administrator for assistance.</p>
        </div>
    </div>
</body>
</html>
