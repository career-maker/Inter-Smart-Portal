<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Ready</title>
    <style type="text/css">
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; }
        .email-container { width: 100%; max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .logo-text { font-size: 22px; font-weight: 800; letter-spacing: 0.5px; color: #f59e0b; margin-bottom: 6px; text-transform: uppercase; }
        .header-title { font-size: 20px; font-weight: 600; color: #ffffff; margin-top: 4px; }
        .content { padding: 32px 24px; }
        .greeting { font-size: 16px; color: #334155; margin-bottom: 16px; }
        .greeting strong { color: #0f172a; }
        .status-badge { display: inline-block; background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #059669; font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; margin-bottom: 20px; }
        .details-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
        .detail-row { display: table; width: 100%; padding: 8px 0; border-bottom: 1px solid #edf2f7; font-size: 14px; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { display: table-cell; width: 40%; font-weight: 600; color: #64748b; }
        .detail-value { display: table-cell; width: 60%; color: #0f172a; font-weight: 500; }
        .comments-box { background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin-bottom: 24px; }
        .comments-title { font-size: 13px; font-weight: 700; color: #b45309; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .comments-text { font-size: 14px; color: #78350f; line-height: 1.5; }
        .actions-section { text-align: center; margin: 28px 0; }
        .btn { display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 8px; margin: 6px 4px; }
        .btn-primary { background-color: #f59e0b; color: #ffffff !important; }
        .btn-secondary { background-color: #0f172a; color: #ffffff !important; }
        .btn-outline { background-color: #f1f5f9; color: #334155 !important; border: 1px solid #cbd5e1; }
        .attachment-note { font-size: 13px; color: #64748b; text-align: center; margin-top: 14px; }
        .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.6; }
        @media (max-width: 600px) {
            .email-container { margin: 0; border-radius: 0; }
            .content { padding: 20px 16px; }
            .detail-row { display: block; }
            .detail-label, .detail-value { display: block; width: 100%; padding: 2px 0; }
            .btn { display: block; width: 100%; margin: 8px 0; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo-text">Inter Smart</div>
            <div class="header-title">Document Request Fulfilled</div>
        </div>

        <div class="content">
            <div class="status-badge">✔ READY FOR DOWNLOAD</div>

            <p class="greeting">
                Hello <strong>{{ $employeeName }}</strong>,
            </p>
            <p style="color: #475569; font-size: 14px; margin-bottom: 20px;">
                Your requested document has been prepared and uploaded by HR/Management.
            </p>

            <div class="details-card">
                <div class="detail-row">
                    <span class="detail-label">Request Number</span>
                    <span class="detail-value" style="font-family: monospace; font-weight: 700;">{{ $requestNumber }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Subject</span>
                    <span class="detail-value">{{ $subject }}</span>
                </div>
                @if($description)
                <div class="detail-row">
                    <span class="detail-label">Request Details</span>
                    <span class="detail-value">{{ $description }}</span>
                </div>
                @endif
                <div class="detail-row">
                    <span class="detail-label">Status</span>
                    <span class="detail-value" style="color: #059669; font-weight: 700;">Uploaded</span>
                </div>
            </div>

            @if($comments)
            <div class="comments-box">
                <div class="comments-title">HR Note / Comments</div>
                <div class="comments-text">{{ $comments }}</div>
            </div>
            @endif

            <div class="actions-section">
                @if($fileUrl)
                    <a href="{{ $fileUrl }}" class="btn btn-primary" target="_blank">Download Document</a>
                @endif

                @if($documentUrl)
                    <a href="{{ $documentUrl }}" class="btn btn-secondary" target="_blank">Open Shared Link</a>
                @endif

                <a href="{{ $portalUrl }}" class="btn btn-outline" target="_blank">View on Portal</a>

                @if($fileUrl)
                    <p class="attachment-note">📎 The document file is also attached to this email.</p>
                @endif
            </div>
        </div>

        <div class="footer">
            <p>Inter Smart Employee Portal</p>
            <p>© {{ date('Y') }} Inter Smart. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
