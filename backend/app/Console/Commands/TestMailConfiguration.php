<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class TestMailConfiguration extends Command
{
    protected $signature = 'mail:test {email=saneesh@intersmart.in}';
    protected $description = 'Test email configuration by sending a test email';

    public function handle()
    {
        $testEmail = $this->argument('email');

        $this->info('🔍 Mail Configuration Test');
        $this->info('═════════════════════════════════');

        // Display current configuration
        $this->info("\n📧 Current Configuration:");
        $this->line('Mailer: ' . config('mail.default'));
        $this->line('Host: ' . config('mail.mailers.smtp.host'));
        $this->line('Port: ' . config('mail.mailers.smtp.port'));
        $this->line('Username: ' . config('mail.mailers.smtp.username'));
        $this->line('From Address: ' . config('mail.from.address'));
        $this->line('From Name: ' . config('mail.from.name'));

        $this->info("\n📤 Attempting to send test email to: {$testEmail}");

        try {
            Mail::raw('This is a test email from Intersmart HR Portal.', function ($message) use ($testEmail) {
                $message->to($testEmail)
                    ->subject('🧪 Test Email - Intersmart HR Portal')
                    ->from(config('mail.from.address'), config('mail.from.name'));
            });

            $this->info("\n✅ SUCCESS! Email sent successfully!");
            $this->info("Check your inbox at: {$testEmail}");

        } catch (\Exception $e) {
            $this->error("\n❌ FAILED! Error details:");
            $this->error("Error: " . $e->getMessage());

            // Detailed error analysis
            $this->info("\n🔧 Troubleshooting Tips:");
            $this->line("1. Check Gmail credentials:");
            $this->line("   - Username: career@intersmart.in");
            $this->line("   - Password: Poloman@11");

            $this->line("\n2. Enable Less Secure App Access:");
            $this->line("   - Go to: https://myaccount.google.com/lesssecureapps");
            $this->line("   - Toggle ON 'Allow less secure apps'");

            $this->line("\n3. Or use Gmail App Password:");
            $this->line("   - Go to: https://myaccount.google.com/apppasswords");
            $this->line("   - Create app password for 'Mail' on 'Windows Computer'");
            $this->line("   - Use that password instead of regular password");

            $this->line("\n4. Check Render environment variables:");
            $this->line("   - MAIL_MAILER=smtp");
            $this->line("   - MAIL_HOST=smtp.gmail.com");
            $this->line("   - MAIL_PORT=587");
            $this->line("   - MAIL_SCHEME=tls");

            $this->line("\n5. Check Laravel logs:");
            $this->line("   - tail -f storage/logs/laravel.log");
        }

        return Command::SUCCESS;
    }
}
