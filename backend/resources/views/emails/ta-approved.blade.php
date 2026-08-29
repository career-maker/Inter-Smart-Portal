<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Travel Allowance Claim Approved</title>
    <style type="text/css">
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; }
        .wrapper { width: 100%; max-width: 650px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #56348f 0%, #3b1d6b 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
        .header p { font-size: 13px; opacity: 0.9; }
        .receipt-badge { display: inline-block; background-color: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-top: 8px; font-family: monospace; }
        .content { padding: 32px 24px; }
        .amount-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
        .amount-card .label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #15803d; letter-spacing: 0.5px; }
        .amount-card .val { font-size: 28px; font-weight: 800; color: #166534; margin-top: 4px; }
        .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .grid-table td { padding: 10px 0; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
        .grid-table .lbl { font-weight: 600; color: #64748b; width: 40%; }
        .grid-table .val { color: #0f172a; font-weight: 500; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
        .items-table th { background: #f1f5f9; padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; }
        .items-table td { padding: 10px 14px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
        .items-table tr:last-child td { border-bottom: none; }
        .btn-box { text-align: center; margin: 28px 0 12px 0; }
        .btn { display: inline-block; background-color: #56348f; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 13px; box-shadow: 0 2px 4px rgba(86,52,143,0.3); }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="header">
            <h1>Travel Allowance Approved</h1>
            <p>Your reimbursement claim has been reviewed and approved.</p>
            @if(!empty($taRequest->receipt_number))
                <div class="receipt-badge">Receipt: {{ $taRequest->receipt_number }}</div>
            @endif
        </div>

        <div class="content">
            <div class="amount-card">
                <div class="label">Approved Reimbursement Amount</div>
                <div class="val">₹{{ number_format((float)($taRequest->approved_amount ?? $taRequest->total_amount), 2) }}</div>
                @if($taRequest->is_paid)
                    <div style="font-size: 11px; color: #166534; font-weight: 700; margin-top: 4px;">✓ Payment Settled & Disbursed</div>
                @endif
            </div>

            <table class="grid-table">
                <tr>
                    <td class="lbl">Applicant:</td>
                    <td class="val">{{ $data['employee_name'] ?? ($taRequest->user->first_name . ' ' . $taRequest->user->last_name) }}</td>
                </tr>
                <tr>
                    <td class="lbl">Travel Date:</td>
                    <td class="val">{{ \Carbon\Carbon::parse($taRequest->date_travelled)->format('d M Y') }}</td>
                </tr>
                <tr>
                    <td class="lbl">Purpose:</td>
                    <td class="val">{{ $taRequest->reason }}</td>
                </tr>
                @if(!empty($taRequest->approval_notes))
                <tr>
                    <td class="lbl">Approval Remark:</td>
                    <td class="val" style="color: #92400e; font-weight: 600;">{{ $taRequest->approval_notes }}</td>
                </tr>
                @endif
                @if(!empty($taRequest->payment_receipt_link))
                <tr>
                    <td class="lbl">Payment Proof:</td>
                    <td class="val">
                        <a href="{{ $taRequest->payment_receipt_link }}" target="_blank" style="color: #56348f; font-weight: 700; text-decoration: underline;">
                            View Payment Screenshot / Voucher ↗
                        </a>
                    </td>
                </tr>
                @endif
            </table>

            @if($taRequest->items && count($taRequest->items) > 0)
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">
                Expense Breakdown
            </div>
            <table class="items-table">
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
                        <td style="font-weight: 600; color: #1e293b;">{{ $item->category }}</td>
                        <td style="color: #64748b;">{{ $item->description ?: '–' }}</td>
                        <td style="text-align: right; font-weight: 700; color: #0f172a;">₹{{ number_format((float)$item->amount, 2) }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            @endif

            <div class="btn-box">
                <a href="{{ config('app.frontend_url', 'https://www.workplace.intersmart.in') }}/ta/status" class="btn">
                    View TA Claim Status
                </a>
            </div>
        </div>

        <div class="footer">
            © {{ date('Y') }} Inter Smart Portal. This is an automated email notification.
        </div>
    </div>
</body>
</html>
