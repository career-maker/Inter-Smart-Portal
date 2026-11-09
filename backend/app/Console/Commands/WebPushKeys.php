<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class WebPushKeys extends Command
{
    protected $signature = 'webpush:keys {--force : Replace existing keys}';

    protected $description = 'Generate the VAPID key pair for browser push notifications and store it in .env';

    public function handle(): int
    {
        if (!class_exists(\Minishlink\WebPush\VAPID::class)) {
            $this->error('minishlink/web-push is not installed. Run: composer update minishlink/web-push --no-dev --with-dependencies');

            return self::FAILURE;
        }

        $envPath = base_path('.env');
        $env = file_exists($envPath) ? file_get_contents($envPath) : '';
        if (preg_match('/^VAPID_PUBLIC_KEY=.+$/m', $env) && !$this->option('force')) {
            $this->info('VAPID keys already exist. Use --force to replace them (every browser must then re-subscribe).');

            return self::SUCCESS;
        }

        $keys = \Minishlink\WebPush\VAPID::createVapidKeys();
        foreach (['VAPID_PUBLIC_KEY' => $keys['publicKey'], 'VAPID_PRIVATE_KEY' => $keys['privateKey']] as $name => $value) {
            if (preg_match("/^{$name}=.*$/m", $env)) {
                $env = preg_replace("/^{$name}=.*$/m", "{$name}={$value}", $env);
            } else {
                $env = rtrim($env) . "\n{$name}={$value}\n";
            }
        }
        file_put_contents($envPath, $env);
        $this->info('VAPID keys written to .env. Now run: php artisan config:clear && php artisan config:cache');

        return self::SUCCESS;
    }
}
