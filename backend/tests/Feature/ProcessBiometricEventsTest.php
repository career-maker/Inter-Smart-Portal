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
        $createdIds = [];
        for ($i = 0; $i < 105; $i++) {
            $localPunch = now()->timezone('Asia/Kolkata')->addMinutes($i);
            $utcPunch = (clone $localPunch)->setTimezone('UTC');
            $event = BiometricEvent::create([
                'source_system' => 'essl',
                'source_table' => 'DeviceLogs',
                'source_event_id' => (string)($i + 1),
                'employee_code' => 'EMP1',
                'local_punch_time' => $localPunch->format('Y-m-d H:i:s'),
                'direction' => 'in',
                'processing_status' => 'pending',
                'device_id' => 'DEV1',
                'source_timezone' => 'Asia/Kolkata',
                'utc_punch_time' => $utcPunch->format('Y-m-d H:i:s'),
            ]);
            $createdIds[] = $event->id;
        }

        $processor = Mockery::mock(BiometricProcessorService::class);
        
        $expectedIds = array_slice($createdIds, 0, 100);
        
        // Assert that the processor is called exactly once with 100 IDs
        $processor->shouldReceive('processEvents')->once()->withArgs(function ($ids) use ($expectedIds) {
            // Verify limit is 100
            if (count($ids) !== 100) return false;
            
            // Verify it's oldest first
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
