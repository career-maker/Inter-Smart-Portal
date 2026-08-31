<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\StorageRetentionController;
use App\Models\SystemSetting;
use Illuminate\Console\Command;

class CleanupRetentionData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'portal:cleanup-retention';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean up expired chat messages and community posts based on retention settings';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting portal data retention cleanup...');

        $autoCleanup = (bool) (SystemSetting::where('key', 'storage_auto_cleanup_enabled')->value('value') ?? true);
        if (!$autoCleanup) {
            $this->warn('Auto-cleanup is disabled in system settings. Skipping.');
            return 0;
        }

        $chatDays = (int) (SystemSetting::where('key', 'chat_retention_days')->value('value') ?? 30);
        $postDays = (int) (SystemSetting::where('key', 'community_posts_retention_days')->value('value') ?? 30);

        $this->line("Chat retention period: {$chatDays} days");
        $this->line("Community posts retention period: {$postDays} days");

        $controller = new StorageRetentionController();
        $result = $controller->executeCleanup($chatDays, $postDays);

        SystemSetting::updateOrCreate(
            ['key' => 'storage_last_cleanup_at'],
            ['value' => $result['timestamp']]
        );

        $this->info("✓ Cleanup complete: {$result['deleted_chat_messages']} chat messages and {$result['deleted_posts']} community posts deleted.");
        return 0;
    }
}
