<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\BiometricEvent;
use Illuminate\Support\Facades\Artisan;
use App\Services\BiometricProcessorService;
use Mockery;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ProcessBiometricEventsTest extends TestCase
{
    use RefreshDatabase;

    public function test_explicit_event_ids_mode_works()
    {
        $processor = Mockery::mock(BiometricProcessorService::class);
        $processor->shouldReceive('processEvents')->once()->with([1, 2])->andReturn(['processed' => 2, 'errors' => 0]);
        $this->app->instance(BiometricProcessorService::class, $processor);

        $this->artisan('biometric:process', ['--event-ids' => '1,2'])
            ->assertExitCode(0);
    }

    public function test_automatic_processor_selection_is_capped_at_100_and_ordered()
    {
        // Create 105 pending events
        for ($i = 0; $i < 105; $i++) {
            BiometricEvent::create([
                'source_table' => 'DeviceLogs',
                'source_event_id' => $i + 1,
                'employee_code' => 'EMP1',
                'local_punch_time' => now()->addMinutes($i),
                'direction' => 'in',
                'processing_status' => 'pending',
                'device_id' => 'DEV1'
            ]);
        }

        $processor = Mockery::mock(BiometricProcessorService::class);
        
        // Assert that the processor is called exactly once with 100 IDs
        $processor->shouldReceive('processEvents')->once()->withArgs(function ($ids) {
            // Verify limit is 100
            if (count($ids) !== 100) return false;
            
            // Verify it's oldest first (IDs 1 through 100 in our test DB since they were inserted in order)
            $expectedIds = range(1, 100);
            return $ids === $expectedIds;
        })->andReturn(['processed' => 100, 'errors' => 0]);
        
        $this->app->instance(BiometricProcessorService::class, $processor);

        $this->artisan('biometric:process')
            ->assertExitCode(0);
    }

    public function test_automatic_mode_with_no_pending_events_exits_cleanly()
    {
        $processor = Mockery::mock(BiometricProcessorService::class);
        $processor->shouldNotReceive('processEvents');
        $this->app->instance(BiometricProcessorService::class, $processor);

        $this->artisan('biometric:process')
            ->expectsOutputToContain('No pending events to process.')
            ->assertExitCode(0);
    }
}
