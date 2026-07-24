<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Travel Allowance Request</title>
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
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 20px;
            margin-bottom: 30px;
            border-radius: 4px;
            text-align: center;
        }
        .status-title { font-size: 13px; font-weight: 600; color: #92400e; text-transform: uppercase; }
        .status-text { font-size: 14px; color: #92400e; margin-top: 5px; }

        /* Amount Box */
        .amount-box {
            background-color: #dbeafe;
            border-left: 4px solid #3b82f6;
            padding: 20px;
            margin-bottom: 30px;
            border-radius: 4px;
            text-align: center;
        }
        .amount-title { font-size: 13px; font-weight: 600; color: #1e40af; text-transform: uppercase; }
        .amount-text { font-size: 28px; font-weight: 700; color: #1e40af; margin-top: 10px; }

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

        /* Breakdown Table */
        .breakdown-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .breakdown-table thead {
            background-color: #f3f4f6;
        }
        .breakdown-table th {
            padding: 12px;
            text-align: left;
            font-size: 13px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            border-bottom: 2px solid #e5e7eb;
        }
        .breakdown-table td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
        }
        .breakdown-table tr:nth-child(even) {
            background-color: #f9fafb;
        }
        .breakdown-amount {
            text-align: right;
            font-weight: 600;
            color: #1f2937;
        }
        .breakdown-total {
            background-color: #f3f4f6;
            font-weight: 700;
            font-size: 15px;
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

        /* Button Group */
        .button-group {
            margin: 30px 0;
            text-align: center;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            margin: 0 8px 8px 0;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
            border-radius: 4px;
            transition: all 0.3s ease;
        }
        .button-approve {
            background-color: #10b981;
            color: white;
        }
        .button-approve:hover {
            background-color: #059669;
        }
        .button-reject {
            background-color: #ef4444;
            color: white;
        }
        .button-reject:hover {
            background-color: #dc2626;
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
            .button { display: block; width: 100%; margin: 10px 0; }
            .detail-label, .detail-value { display: block; width: auto; padding: 10px 0; }
            .detail-value { padding-left: 0; }
            .amount-text { font-size: 24px; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <div class="logo">Inter Smart</div>
            <h1 class="header-title">Travel Allowance Request</h1>
            <p class="header-subtitle">Awaiting Your Approval</p>
        </div>

        <!-- Content -->
        <div class="content">
            <div class="content-wrapper">
                <!-- Amount -->
                <div class="amount-box">
                    <div class="amount-title">Total Amount Requested</div>
                    <div class="amount-text">₹{{ number_format($taRequest->total_amount, 2) }}</div>
                </div>

                <!-- Status -->
                <div class="status-box">
                    <div class="status-title">Status: Pending Approval</div>
                    <div class="status-text">A travel allowance request requires your review and approval</div>
                </div>

                <!-- Employee Details -->
                <div>
                    <div style="font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 15px;">Employee Information</div>
                    <div class="details-grid">
                        <div class="detail-item">
                            <div class="detail-label">Name</div>
                            <div class="detail-value">{{ $taRequest->user->first_name }} {{ $taRequest->user->last_name }}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Employee ID</div>
                            <div class="detail-value">{{ $taRequest->user->employee_code }}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Designation</div>
                            <div class="detail-value">{{ $taRequest->user->designation ?? 'N/A' }}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Department</div>
                            <div class="detail-value">{{ $taRequest->user->team->name ?? 'Unassigned' }}</div>
                        </div>
                    </div>
                </div>

                <!-- Travel Details -->
                <div style="margin-top: 30px;">
                    <div style="font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 15px;">Travel Details</div>
                    <div class="details-grid">
                        <div class="detail-item">
                            <div class="detail-label">Travel Date</div>
                            <div class="detail-value">{{ \Carbon\Carbon::parse($taRequest->date_travelled)->format('d M Y') }}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Applied On</div>
                            <div class="detail-value">{{ \Carbon\Carbon::parse($taRequest->created_at)->format('d M Y H:i') }}</div>
                        </div>
                    </div>
                </div>

                <!-- Reason -->
                <div class="reason-box">
                    <div class="reason-label">Purpose of Travel</div>
                    <div class="reason-text">{{ $taRequest->reason }}</div>
                </div>

                <!-- Expense Breakdown -->
                <div style="margin-top: 30px;">
                    <div style="font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 15px;">Expense Breakdown</div>
                    <table class="breakdown-table">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Description</th>
                                <th style="text-align: right;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach($taRequest->items as $item)
                                <tr>
                                    <td><strong>{{ $item->category }}</strong></td>
                                    <td>{{ $item->description ?? '—' }}</td>
                                    <td class="breakdown-amount">₹{{ number_format($item->amount, 2) }}</td>
                                </tr>
                            @endforeach
                            <tr class="breakdown-total">
                                <td colspan="2">Total</td>
                                <td class="breakdown-amount">₹{{ number_format($taRequest->total_amount, 2) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Action -->
                <div class="action-box">
                    <div class="action-title">Next Steps</div>
                    <div class="action-text">Please review the travel allowance request and approve or reject it using the buttons below or log into the HR Portal.</div>
                </div>

                <!-- Action Buttons -->
                <div class="button-group">
                    <a href="{{ $data['approve_url'] }}" class="button button-approve">✓ Approve Request</a>
                    <a href="{{ $data['reject_url'] }}" class="button button-reject">✗ Reject Request</a>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-message">
                <strong>Inter Smart HR Portal</strong><br>
                This is an automated email. Please do not reply directly to this message.
            </div>
            <div class="footer-credit">
                © {{ date('Y') }} Inter Smart. All rights reserved. | Developed By Team QA
            </div>
        </div>
    </div>
</body>
</html>
