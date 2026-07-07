<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\BiometricProcessorService;

class ProcessBiometricEvents extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'biometric:process {--event-ids= : Comma-separated list of event IDs to process}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process pending biometric events into attendance records';

    /**
     * Execute the console command.
     */
    public function handle(BiometricProcessorService $processor): int
    {
        $eventIds = $this->option('event-ids');
        if (!empty($eventIds)) {
            $ids = array_map('trim', explode(',', $eventIds));
            $ids = array_filter($ids, 'is_numeric');

            if (empty($ids)) {
                $this->error('No valid event IDs provided.');
                return self::FAILURE;
            }
        } else {
            // Automatic bounded processing mode
            $ids = \App\Models\BiometricEvent::where('processing_status', 'pending')
                ->orderBy('id', 'asc')
                ->limit(100)
                ->pluck('id')
                ->toArray();
                
            if (empty($ids)) {
                $this->info('No pending events to process.');
                return self::SUCCESS;
            }
        }

        $this->info(sprintf('Processing %d biometric events...', count($ids)));
        
        $results = $processor->processEvents($ids);
        
        $this->info(sprintf('Processed: %d, Errors: %d', $results['processed'], $results['errors']));
        
        return self::SUCCESS;
    }
}
