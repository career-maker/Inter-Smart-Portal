<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $data['subject'] ?? 'Community Notification' }}</title>
    <style type="text/css">
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; }
        .wrapper { width: 100%; background-color: #f8fafc; padding: 30px 15px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #56348f 0%, #3d2366 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .header-badge { display: inline-block; padding: 5px 14px; background-color: rgba(255, 255, 255, 0.18); border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
        .header h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 6px; }
        .header p { font-size: 14px; color: #e9d5ff; }
        .body { padding: 32px 24px; }
        .author-box { display: flex; align-items: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9; }
        .author-info { font-size: 14px; }
        .author-name { font-weight: 700; color: #0f172a; }
        .author-meta { font-size: 12px; color: #64748b; }
        .content-box { background-color: #f8fafc; border-left: 4px solid #56348f; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px; font-size: 15px; color: #334155; line-height: 1.7; white-space: pre-wrap; }
        .badge-pill { display: inline-block; background-color: #ede9fe; color: #56348f; padding: 4px 12px; border-radius: 16px; font-size: 13px; font-weight: 600; margin-bottom: 14px; }
        .options-list { margin: 16px 0 20px 0; padding: 0; list-style: none; }
        .option-item { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 16px; margin-bottom: 8px; font-size: 14px; color: #1e293b; }
        .cta-container { text-align: center; margin: 30px 0 10px 0; }
        .cta-button { display: inline-block; background: #56348f; color: #ffffff !important; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; transition: background 0.2s; box-shadow: 0 2px 4px rgba(86, 52, 143, 0.25); }
        .cta-button:hover { background: #452773; }
        .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; }
        .footer p { margin-bottom: 6px; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <!-- Header -->
            <div class="header">
                <div class="header-badge">{{ $data['type_badge'] ?? 'Community' }}</div>
                <h1>{{ $data['headline'] ?? 'New Update in Workplace Community' }}</h1>
                <p>{{ $data['subheadline'] ?? 'Check out what is happening across the team' }}</p>
            </div>

            <!-- Body -->
            <div class="body">
                <!-- Author details -->
                <div class="author-box">
                    <div class="author-info">
                        <div class="author-name">{{ $data['author_name'] }}</div>
                        <div class="author-meta">{{ $data['author_designation'] }} • {{ $data['created_at'] }}</div>
                    </div>
                </div>

                <!-- Badge if praise -->
                @if(!empty($data['badge']))
                    <div>
                        <span class="badge-pill">🎖️ {{ $data['badge'] }}</span>
                        @if(!empty($data['praised_names']))
                            <div style="font-size: 14px; font-weight: 600; color: #56348f; margin-bottom: 12px;">
                                Praised: {{ $data['praised_names'] }}
                            </div>
                        @endif
                    </div>
                @endif

                <!-- Content text -->
                <div class="content-box">{{ $data['content'] }}</div>

                <!-- Poll options preview if poll -->
                @if(!empty($data['poll_options']) && is_array($data['poll_options']))
                    <div style="margin-bottom: 20px;">
                        <div style="font-size: 13px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 8px;">Poll Options:</div>
                        <div class="options-list">
                            @foreach($data['poll_options'] as $option)
                                <div class="option-item">🔘 {{ is_array($option) ? ($option['text'] ?? '') : $option }}</div>
                            @endforeach
                        </div>
                    </div>
                @endif

                <!-- CTA -->
                <div class="cta-container">
                    <a href="{{ $data['action_url'] }}" class="cta-button">
                        View & Engage in Community →
                    </a>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p><strong>Inter Smart HR Portal</strong> • Workplace Community</p>
                <p>You received this because an employee shared a broadcast update with the team.</p>
                <p>© {{ date('Y') }} Inter Smart. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
