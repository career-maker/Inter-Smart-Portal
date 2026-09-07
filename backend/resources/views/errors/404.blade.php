<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Page Not Found | Inter Smart</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: "Proxima Nova", 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #ffffff;
            color: #0f172a;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            user-select: none;
        }
        .container {
            width: 100%;
            max-width: 650px;
            text-align: center;
            margin: 0 auto;
        }
        .gif-container {
            background-image: url('https://cdn.21st.dev/assets/mirror/35/354f63f88b57aceea4536df0c0cff0c3592aa46fe887ff910751fefc12f3e76c.gif');
            height: 380px;
            background-position: center;
            background-repeat: no-repeat;
            background-size: contain;
            display: flex;
            align-items: flex-start;
            justify-content: center;
        }
        h1 {
            text-align: center;
            color: #0f172a;
            font-size: 5.5rem;
            padding-top: 2rem;
            font-weight: 900;
            letter-spacing: -0.05em;
        }
        .content {
            margin-top: -45px;
        }
        h3 {
            font-size: 1.85rem;
            font-weight: 700;
            margin-bottom: 0.75rem;
            color: #0f172a;
            letter-spacing: -0.025em;
        }
        p {
            color: #64748b;
            font-size: 1.05rem;
            margin-bottom: 1.5rem;
            font-weight: 400;
        }
        .home-btn {
            display: inline-block;
            background-color: #56348f;
            color: #ffffff;
            font-weight: 600;
            font-size: 0.95rem;
            padding: 0.75rem 1.75rem;
            border-radius: 0.75rem;
            text-decoration: none;
            box-shadow: 0 4px 14px rgba(86, 52, 143, 0.3);
            transition: all 0.2s ease;
            cursor: pointer;
        }
        .home-btn:hover {
            opacity: 0.92;
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(86, 52, 143, 0.4);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="gif-container" aria-hidden="true">
            <h1>404</h1>
        </div>
        <div class="content">
            <h3>Look like you're lost</h3>
            <p>The page you are looking for is not available!</p>
            <a href="{{ config('app.frontend_url') ?: env('FRONTEND_URL', 'https://workplace.intersmart.in') }}" class="home-btn">
                Go to Home
            </a>
        </div>
    </div>
</body>
</html>
