<?php
// Simple mail test script
require 'vendor/autoload.php';

$config = [
    'driver' => 'smtp',
    'host' => 'smtp.gmail.com',
    'port' => 587,
    'from' => ['address' => 'career@intersmart.in', 'name' => 'Intersmart'],
    'encryption' => 'tls',
    'username' => 'career@intersmart.in',
    'password' => 'Poloman@11'
];

echo "Testing Mail Configuration:\n";
echo "============================\n\n";

echo "1. Config Details:\n";
echo "   Driver: " . $config['driver'] . "\n";
echo "   Host: " . $config['host'] . "\n";
echo "   Port: " . $config['port'] . "\n";
echo "   Username: " . $config['username'] . "\n";
echo "   Password: " . (strlen($config['password']) > 0 ? "SET" : "NOT SET") . "\n";
echo "   Encryption: " . $config['encryption'] . "\n\n";

echo "2. .env File Check:\n";
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    $envContent = file_get_contents($envFile);
    echo "   ✅ .env file exists\n";

    if (strpos($envContent, 'MAIL_MAILER=smtp') !== false) {
        echo "   ✅ MAIL_MAILER=smtp\n";
    } else {
        echo "   ❌ MAIL_MAILER is not 'smtp'\n";
    }

    if (strpos($envContent, 'MAIL_HOST=smtp.gmail.com') !== false) {
        echo "   ✅ MAIL_HOST=smtp.gmail.com\n";
    } else {
        echo "   ❌ MAIL_HOST not correct\n";
    }
} else {
    echo "   ❌ .env file not found\n";
}

echo "\n3. Laravel Mail Configuration:\n";
try {
    $app = require_once __DIR__ . '/bootstrap/app.php';
    $app->make('Illuminate\Contracts\Http\Kernel');

    $mailDriver = config('mail.default');
    $mailHost = config('mail.mailers.smtp.host');
    $mailPort = config('mail.mailers.smtp.port');

    echo "   Driver: " . $mailDriver . "\n";
    echo "   Host: " . $mailHost . "\n";
    echo "   Port: " . $mailPort . "\n";
} catch (Exception $e) {
    echo "   Error: " . $e->getMessage() . "\n";
}

echo "\n✅ Test Complete\n";
?>
