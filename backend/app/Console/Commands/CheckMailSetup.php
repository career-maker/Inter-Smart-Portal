<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Config;

class CheckMailSetup extends Command
{
    protected $signature = 'mail:check';
    protected $description = 'Check mail configuration without sending emails';

    public function handle()
    {
        $this->info('📧 Mail Configuration Diagnostic Report');
        $this->info('══════════════════════════════════════');

        // Check 1: Mail Driver
        $this->info("\n1️⃣  Mail Driver:");
        $driver = config('mail.default');
        $this->line("   Driver: {$driver}");
        if ($driver === 'smtp') {
            $this->line("   ✅ SMTP driver is set");
        } else {
            $this->error("   ❌ Wrong driver: {$driver} (should be 'smtp')");
        }

        // Check 2: SMTP Configuration
        $this->info("\n2️⃣  SMTP Configuration:");
        $host = config('mail.mailers.smtp.host');
        $port = config('mail.mailers.smtp.port');
        $encryption = config('mail.mailers.smtp.encryption');
        $username = config('mail.mailers.smtp.username');
        $password = config('mail.mailers.smtp.password');

        $this->line("   Host: {$host}");
        $this->line("   Port: {$port}");
        $this->line("   Encryption: {$encryption}");
        $this->line("   Username: {$username}");
        $this->line("   Password: " . (strlen($password) > 0 ? '✅ SET' : '❌ MISSING'));

        // Validation
        $errors = [];
        if ($host !== 'smtp.gmail.com') {
            $errors[] = "Host should be 'smtp.gmail.com', got '{$host}'";
        }
        if ($port != 587) {
            $errors[] = "Port should be 587, got {$port}";
        }
        if ($encryption !== 'tls') {
            $errors[] = "Encryption should be 'tls', got '{$encryption}'";
        }
        if ($username !== 'career@intersmart.in') {
            $errors[] = "Username should be 'career@intersmart.in', got '{$username}'";
        }
        if (empty($password)) {
            $errors[] = "Password is empty!";
        }

        if (!empty($errors)) {
            $this->error("\n   ❌ Configuration Issues Found:");
            foreach ($errors as $error) {
                $this->error("      - {$error}");
            }
        } else {
            $this->info("\n   ✅ All SMTP settings look correct!");
        }

        // Check 3: From Address
        $this->info("\n3️⃣  From Address:");
        $fromAddress = config('mail.from.address');
        $fromName = config('mail.from.name');
        $this->line("   Address: {$fromAddress}");
        $this->line("   Name: {$fromName}");

        if ($fromAddress === 'career@intersmart.in') {
            $this->line("   ✅ From address is correct");
        } else {
            $this->error("   ❌ From address should be 'career@intersmart.in'");
        }

        // Check 4: Environment Variables
        $this->info("\n4️⃣  Environment Variables:");
        $envFile = base_path('.env');
        if (file_exists($envFile)) {
            $this->line("   ✅ .env file exists");

            // Read and check .env
            $envContent = file_get_contents($envFile);
            $mailVars = [
                'MAIL_MAILER',
                'MAIL_HOST',
                'MAIL_PORT',
                'MAIL_USERNAME',
                'MAIL_PASSWORD',
                'MAIL_FROM_ADDRESS',
                'MAIL_FROM_NAME'
            ];

            foreach ($mailVars as $var) {
                if (strpos($envContent, $var) !== false) {
                    $this->line("   ✅ {$var} is defined");
                } else {
                    $this->error("   ❌ {$var} is missing from .env");
                }
            }
        } else {
            $this->error("   ❌ .env file not found!");
        }

        // Check 5: Frontend URL
        $this->info("\n5️⃣  Frontend URL (for approval links):");
        $frontendUrl = config('app.frontend_url');
        $this->line("   URL: {$frontendUrl}");
        if (empty($frontendUrl)) {
            $this->error("   ❌ FRONTEND_URL is not set!");
        } else {
            $this->line("   ✅ FRONTEND_URL is configured");
        }

        // Check 6: Log File
        $this->info("\n6️⃣  Log File:");
        $logFile = storage_path('logs/laravel.log');
        if (file_exists($logFile)) {
            $size = filesize($logFile);
            $this->line("   ✅ Log file exists ({$size} bytes)");

            $lastModified = filemtime($logFile);
            $timeAgo = time() - $lastModified;
            $this->line("   Last modified: {$timeAgo} seconds ago");
        } else {
            $this->error("   ❌ Log file not found!");
        }

        // Summary
        $this->info("\n" . str_repeat('═', 40));
        $this->info("NEXT STEPS:");
        $this->info("1. Run: php artisan mail:test saneesh@intersmart.in");
        $this->info("2. Check Gmail inbox for test email");
        $this->info("3. Check logs: tail -f storage/logs/laravel.log");
        $this->info("4. If still no email:");
        $this->info("   - Enable Less Secure App Access on Gmail");
        $this->info("   - Or use App Password instead");
        $this->info("═" . str_repeat('═', 39));

        return Command::SUCCESS;
    }
}
