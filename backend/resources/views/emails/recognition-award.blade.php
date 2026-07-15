<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recognition Award</title>
    <style type="text/css">
        * { margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 100%; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .wrapper { max-width: 600px; margin: 0 auto; }

        /* Header Section */
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 60px 20px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .header::before {
            content: '✨';
            position: absolute;
            top: 10px;
            left: 20px;
            font-size: 40px;
            opacity: 0.3;
        }
        .header::after {
            content: '🏆';
            position: absolute;
            top: 10px;
            right: 20px;
            font-size: 40px;
            opacity: 0.3;
        }
        .header-content {
            position: relative;
            z-index: 1;
        }
        .header h1 {
            font-size: 28px;
            margin: 0 0 10px 0;
            font-weight: 700;
            letter-spacing: 1px;
        }
        .header p {
            font-size: 14px;
            margin: 0;
            opacity: 0.95;
        }

        /* Award Badge Section */
        .award-badge-section {
            background: white;
            padding: 40px 20px;
            text-align: center;
        }
        .award-badge {
            display: inline-block;
            width: 120px;
            height: 120px;
            background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 60px;
            margin: 0 auto 20px;
            box-shadow: 0 10px 30px rgba(245, 158, 11, 0.3);
            animation: pulse-glow 2s ease-in-out infinite;
        }
        @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 10px 30px rgba(245, 158, 11, 0.3); }
            50% { box-shadow: 0 10px 50px rgba(245, 158, 11, 0.6); }
        }
        .award-title {
            font-size: 24px;
            font-weight: 700;
            color: #1f2937;
            margin: 20px 0 10px 0;
        }
        .award-subtitle {
            font-size: 16px;
            color: #667eea;
            margin: 0;
            font-weight: 600;
        }

        /* Content Section */
        .content {
            background: white;
            padding: 40px 30px;
        }
        .congratulations {
            font-size: 16px;
            color: #374151;
            line-height: 1.8;
            margin-bottom: 30px;
            text-align: center;
        }
        .congratulations strong {
            color: #667eea;
            font-weight: 700;
        }

        /* Details Section */
        .details-section {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
            border-left: 4px solid #667eea;
            padding: 25px;
            border-radius: 8px;
            margin: 30px 0;
        }
        .detail-item {
            margin-bottom: 20px;
        }
        .detail-item:last-child {
            margin-bottom: 0;
        }
        .detail-label {
            font-size: 12px;
            font-weight: 700;
            color: #667eea;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }
        .detail-value {
            font-size: 16px;
            color: #1f2937;
            font-weight: 500;
        }

        /* Description Box */
        .description-box {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            margin: 25px 0;
            font-size: 14px;
            color: #4b5563;
            line-height: 1.8;
            font-style: italic;
        }

        /* Appreciation Message */
        .appreciation {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-left: 4px solid #f59e0b;
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
            text-align: center;
        }
        .appreciation-icon {
            font-size: 40px;
            margin-bottom: 10px;
        }
        .appreciation-text {
            font-size: 14px;
            color: #78350f;
            font-weight: 600;
            line-height: 1.6;
        }

        /* Info Box */
        .info-box {
            background: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 15px;
            border-radius: 6px;
            font-size: 13px;
            color: #1e40af;
            margin: 25px 0;
        }

        /* Footer Section */
        .footer {
            background: #f8f9fa;
            padding: 30px 20px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .footer-message {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 15px;
            line-height: 1.6;
        }
        .footer-credit {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
        }

        /* Responsive */
        @media (max-width: 600px) {
            .container { width: 100%; }
            .header { padding: 40px 20px; }
            .header h1 { font-size: 22px; }
            .award-badge { width: 100px; height: 100px; font-size: 50px; }
            .award-title { font-size: 20px; }
            .content { padding: 25px 20px; }
            .details-section { padding: 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="wrapper">
            <!-- Header -->
            <div class="header">
                <div class="header-content">
                    <h1>🏆 YOU'VE BEEN RECOGNIZED!</h1>
                    <p>Congratulations on your achievement</p>
                </div>
            </div>

            <!-- Award Badge -->
            <div class="award-badge-section">
                <div class="award-badge">{{ $data['icon'] ?? '⭐' }}</div>
                <h2 class="award-title">{{ $data['title'] }}</h2>
                <p class="award-subtitle">{{ $data['employee_name'] }}</p>
            </div>

            <!-- Content -->
            <div class="content">
                <!-- Congratulations Message -->
                <p class="congratulations">
                    Congratulations <strong>{{ $data['employee_name'] }}</strong>!
                    You have been awarded the <strong>"{{ $data['title'] }}"</strong> recognition by
                    <strong>{{ $data['awarded_by'] }}</strong>.
                </p>

                <!-- Details -->
                <div class="details-section">
                    <div class="detail-item">
                        <div class="detail-label">Award Title</div>
                        <div class="detail-value">{{ $data['title'] }}</div>
                    </div>
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
                        <div class="detail-label">Award Period</div>
                        <div class="detail-value">{{ $data['start_date'] }} to {{ $data['end_date'] }}</div>
                    </div>
                </div>

                <!-- Description -->
                @if($data['description'])
                <div>
                    <div class="detail-label" style="margin-bottom: 10px;">Description</div>
                    <div class="description-box">
                        {{ $data['description'] }}
                    </div>
                </div>
                @endif

                <!-- Appreciation Message -->
                <div class="appreciation">
                    <div class="appreciation-icon">✨💪🌟</div>
                    <div class="appreciation-text">
                        Your hard work, dedication, and excellence have been recognized.
                        Keep up the great work!
                    </div>
                </div>

                <!-- Info Box -->
                <div class="info-box">
                    <strong>ℹ️ Achievement Unlocked!</strong><br>
                    This recognition is now displayed on your profile and in the Hall of Fame.
                    Your colleagues can see your achievements!
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p class="footer-message">
                    <strong>Thank you for your outstanding contribution to Intersmart!</strong><br>
                    Your achievements inspire the entire team.
                </p>
                <p class="footer-credit">
                    © {{ date('Y') }} Intersmart. All rights reserved.<br>
                    <strong>Developed By Team QA</strong>
                </p>
            </div>
        </div>
    </div>
</body>
</html>
