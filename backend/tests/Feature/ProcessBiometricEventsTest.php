<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\BiometricEvent;
use App\Models\User;
use App\Models\Attendance;
use App\Models\AttendanceBreak;
use App\Models\Team;
use App\Services\BiometricProcessorService;
use App\Services\BiometricTimelineService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Mockery;

class ProcessBiometricEventsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Helpers
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    private function makeEvent(string $employeeCode, string $localTime, string $direction, string $status = 'pending', int $seqId = 0): BiometricEvent
    {
        static $seq = 1000;
        $seq++;
        return BiometricEvent::create([
            'source_system'   => 'essl',
            'source_table'    => 'DeviceLogs',
            'source_event_id' => (string)($seqId ?: $seq),
            'employee_code'   => $employeeCode,
            'local_punch_time' => $localTime,
            'direction'        => $direction,
            'device_id'        => 'DEV1',
            'source_timezone'  => 'Asia/Kolkata',
            'utc_punch_time'   => $localTime, // simplified â€“ UTC offset not relevant to these tests
            'processing_status' => $status,
        ]);
    }

    private function processor(): BiometricProcessorService
    {
        return new BiometricProcessorService(new BiometricTimelineService());
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Command-mode tests (existing)
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public function test_explicit_event_ids_mode_works()
    {
        $mock = Mockery::mock(BiometricProcessorService::class);
        $mock->shouldReceive('processEvents')->once()->with([1, 2])->andReturn(['processed' => 2, 'errors' => 0]);
        $this->app->instance(BiometricProcessorService::class, $mock);

        $this->artisan('biometric:process', ['--event-ids' => '1,2'])->assertExitCode(0);
    }

    public function test_automatic_processor_selection_is_capped_at_100_and_ordered()
    {
        $createdIds = [];
        for ($i = 0; $i < 105; $i++) {
            $localPunch = now()->timezone('Asia/Kolkata')->addMinutes($i);
            $utcPunch   = (clone $localPunch)->setTimezone('UTC');
            $event = BiometricEvent::create([
                'source_system'    => 'essl',
                'source_table'     => 'DeviceLogs',
                'source_event_id'  => (string)($i + 1),
                'employee_code'    => 'EMP1',
                'local_punch_time' => $localPunch->format('Y-m-d H:i:s'),
                'direction'        => 'in',
                'processing_status' => 'pending',
                'device_id'        => 'DEV1',
                'source_timezone'  => 'Asia/Kolkata',
                'utc_punch_time'   => $utcPunch->format('Y-m-d H:i:s'),
            ]);
            $createdIds[] = $event->id;
        }

        $mock = Mockery::mock(BiometricProcessorService::class);
        $expectedIds = array_slice($createdIds, 0, 100);
        $mock->shouldReceive('processEvents')->once()->withArgs(function ($ids) use ($expectedIds) {
            return count($ids) === 100 && $ids === $expectedIds;
        })->andReturn(['processed' => 100, 'errors' => 0]);
        $this->app->instance(BiometricProcessorService::class, $mock);

        $this->artisan('biometric:process')->assertExitCode(0);
    }

    public function test_automatic_mode_with_no_pending_events_exits_cleanly()
    {
        $mock = Mockery::mock(BiometricProcessorService::class);
        $mock->shouldNotReceive('processEvents');
        $this->app->instance(BiometricProcessorService::class, $mock);

        $this->artisan('biometric:process')
            ->expectsOutputToContain('No pending events to process.')
            ->assertExitCode(0);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // BiometricTimelineService unit tests
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /** @test */
    public function test_timeline_service_simple_in_out()
    {
        $svc    = new BiometricTimelineService();
        $events = collect([
            (object)['id' => 1, 'direction' => 'in',  'local_punch_time' => '2026-07-07 09:00:00'],
            (object)['id' => 2, 'direction' => 'out', 'local_punch_time' => '2026-07-07 18:00:00'],
        ]);
        $build  = $svc->buildTimeline($events);
        $this->assertTrue($build['ok']);
        $this->assertCount(2, $build['timeline']);

        $interp = $svc->interpretTimeline($build['timeline'], '2026-07-07');
        $this->assertEquals('2026-07-07 09:00:00', $interp['first_in']->format('Y-m-d H:i:s'));
        $this->assertEquals('2026-07-07 18:00:00', $interp['last_out']->format('Y-m-d H:i:s'));
        $this->assertFalse($interp['has_missing_punch_out']);
        $this->assertFalse($interp['is_currently_working']);
        $this->assertEquals(540, $interp['total_working_minutes']);
        $this->assertCount(0, $interp['completed_breaks']);
    }

    /** @test */
    public function test_first_in_retained_after_multiple_later_in_events()
    {
        $svc    = new BiometricTimelineService();
        $events = collect([
            (object)['id' => 1, 'direction' => 'in',  'local_punch_time' => '2026-07-07 09:00:00'],
            (object)['id' => 2, 'direction' => 'in',  'local_punch_time' => '2026-07-07 09:05:00'], // duplicate IN
            (object)['id' => 3, 'direction' => 'out', 'local_punch_time' => '2026-07-07 18:00:00'],
        ]);
        $build  = $svc->buildTimeline($events);
        $interp = $svc->interpretTimeline($build['timeline'], '2026-07-07');

        $this->assertEquals('2026-07-07 09:00:00', $interp['first_in']->format('Y-m-d H:i:s'),
            'First IN must be the earliest, not overwritten by subsequent consecutive IN');
    }

    /** @test */
    public function test_last_out_retained_after_multiple_earlier_out_events()
    {
        $svc    = new BiometricTimelineService();
        $events = collect([
            (object)['id' => 1, 'direction' => 'in',  'local_punch_time' => '2026-07-07 09:00:00'],
            (object)['id' => 2, 'direction' => 'out', 'local_punch_time' => '2026-07-07 18:00:00'],
            (object)['id' => 3, 'direction' => 'out', 'local_punch_time' => '2026-07-07 18:05:00'], // later OUT
        ]);
        $build  = $svc->buildTimeline($events);
        $interp = $svc->interpretTimeline($build['timeline'], '2026-07-07');

        $this->assertEquals('2026-07-07 18:05:00', $interp['last_out']->format('Y-m-d H:i:s'),
            'Last OUT must be the latest consecutive OUT, not the first one');
        $this->assertEquals(545, $interp['total_working_minutes']);
    }

    /** @test */
    public function test_final_unmatched_in_after_earlier_out_preserves_last_out_and_flags_missing()
    {
        $svc    = new BiometricTimelineService();
        // Sequence: IN â†’ OUT â†’ IN  (final IN has no OUT)
        $events = collect([
            (object)['id' => 1, 'direction' => 'in',  'local_punch_time' => '2026-07-06 09:00:00'],
            (object)['id' => 2, 'direction' => 'out', 'local_punch_time' => '2026-07-06 12:00:00'],
            (object)['id' => 3, 'direction' => 'in',  'local_punch_time' => '2026-07-06 13:00:00'],
        ]);
        $build  = $svc->buildTimeline($events);
        $interp = $svc->interpretTimeline($build['timeline'], '2026-07-06');

        // last_out must be preserved from the real checkout at 12:00
        $this->assertEquals('2026-07-06 12:00:00', $interp['last_out']->format('Y-m-d H:i:s'),
            'last_out must not be nulled just because a later unmatched IN exists');
        $this->assertTrue($interp['has_missing_punch_out'],
            'has_missing_punch_out must be true for a historical day ending with IN');
        $this->assertTrue($interp['requires_review']);
        // Working minutes only from completed session (09:00â€“12:00 = 180)
        $this->assertEquals(180, $interp['total_working_minutes']);
    }

    /** @test */
    public function test_final_unmatched_in_on_current_day_flags_currently_working()
    {
        $svc     = new BiometricTimelineService();
        $today   = Carbon::today()->format('Y-m-d');
        $events  = collect([
            (object)['id' => 1, 'direction' => 'in',  'local_punch_time' => "{$today} 09:00:00"],
        ]);
        $build   = $svc->buildTimeline($events);
        $interp  = $svc->interpretTimeline($build['timeline'], $today);

        $this->assertTrue($interp['is_currently_working']);
        $this->assertFalse($interp['has_missing_punch_out'],
            'Current day open shift must not be labelled missing punch out');
        $this->assertNull($interp['total_working_minutes'],
            'No completed sessions yet â€” working minutes must be null');
    }

    /** @test */
    public function test_final_unmatched_out_complete_shift()
    {
        // Day ends on OUT â€” this is the normal complete-shift path
        $svc    = new BiometricTimelineService();
        $events = collect([
            (object)['id' => 1, 'direction' => 'in',  'local_punch_time' => '2026-07-07 09:00:00'],
            (object)['id' => 2, 'direction' => 'out', 'local_punch_time' => '2026-07-07 18:00:00'],
        ]);
        $build  = $svc->buildTimeline($events);
        $interp = $svc->interpretTimeline($build['timeline'], '2026-07-07');

        $this->assertEquals('outside', $interp['current_sequence_state']);
        $this->assertFalse($interp['has_missing_punch_out']);
        $this->assertFalse($interp['is_currently_working']);
    }

    /** @test */
    public function test_only_in_punches()
    {
        $svc    = new BiometricTimelineService();
        $events = collect([
            (object)['id' => 1, 'direction' => 'in', 'local_punch_time' => '2026-07-06 09:00:00'],
            (object)['id' => 2, 'direction' => 'in', 'local_punch_time' => '2026-07-06 10:00:00'],
        ]);
        $build  = $svc->buildTimeline($events);
        $interp = $svc->interpretTimeline($build['timeline'], '2026-07-06');

        $this->assertNotNull($interp['first_in']);
        $this->assertNull($interp['last_out']);
        $this->assertTrue($interp['has_missing_punch_out']);
        $this->assertNull($interp['total_working_minutes']);
    }

    /** @test */
    public function test_only_out_punches_results_in_invalid_sequence()
    {
        $svc    = new BiometricTimelineService();
        $events = collect([
            (object)['id' => 1, 'direction' => 'out', 'local_punch_time' => '2026-07-07 09:00:00'],
            (object)['id' => 2, 'direction' => 'out', 'local_punch_time' => '2026-07-07 10:00:00'],
        ]);
        $build  = $svc->buildTimeline($events, false);

        // No IN ever â†’ timeline is empty after stripping orphans
        $this->assertEmpty($build['timeline']);
        $this->assertCount(2, $build['orphan_event_ids']);
    }

    /** @test */
    public function test_leading_orphan_outs_are_collected()
    {
        $svc    = new BiometricTimelineService();
        $events = collect([
            (object)['id' => 1, 'direction' => 'out', 'local_punch_time' => '2026-07-07 08:20:00'],
            (object)['id' => 2, 'direction' => 'out', 'local_punch_time' => '2026-07-07 08:25:00'],
            (object)['id' => 3, 'direction' => 'in',  'local_punch_time' => '2026-07-07 09:00:00'],
            (object)['id' => 4, 'direction' => 'out', 'local_punch_time' => '2026-07-07 18:00:00'],
        ]);
        $build  = $svc->buildTimeline($events, false);

        $this->assertTrue($build['ok']);
        $this->assertContains(1, $build['orphan_event_ids']);
        $this->assertContains(2, $build['orphan_event_ids']);
        $this->assertCount(2, $build['orphan_event_ids']);

        $interp = $svc->interpretTimeline($build['timeline'], '2026-07-07');
        $this->assertEquals('2026-07-07 09:00:00', $interp['first_in']->format('Y-m-d H:i:s'));
    }

    /** @test */
    public function test_consecutive_duplicate_ins_first_retained()
    {
        $svc    = new BiometricTimelineService();
        $events = collect([
            (object)['id' => 1, 'direction' => 'in',  'local_punch_time' => '2026-07-07 09:00:00'],
            (object)['id' => 2, 'direction' => 'in',  'local_punch_time' => '2026-07-07 09:05:00'],
            (object)['id' => 3, 'direction' => 'in',  'local_punch_time' => '2026-07-07 09:10:00'],
            (object)['id' => 4, 'direction' => 'out', 'local_punch_time' => '2026-07-07 18:00:00'],
        ]);
        $build  = $svc->buildTimeline($events, false);
        $interp = $svc->interpretTimeline($build['timeline'], '2026-07-07');

        $this->assertEquals('2026-07-07 09:00:00', $interp['first_in']->format('Y-m-d H:i:s'));
        $this->assertCount(0, $interp['completed_breaks']);
    }

    /** @test */
    public function test_consecutive_duplicate_outs_last_retained()
    {
        $svc    = new BiometricTimelineService();
        $events = collect([
            (object)['id' => 1, 'direction' => 'in',  'local_punch_time' => '2026-07-07 09:00:00'],
            (object)['id' => 2, 'direction' => 'out', 'local_punch_time' => '2026-07-07 12:00:00'],
            (object)['id' => 3, 'direction' => 'out', 'local_punch_time' => '2026-07-07 12:01:00'],
            (object)['id' => 4, 'direction' => 'out', 'local_punch_time' => '2026-07-07 12:02:00'],
            (object)['id' => 5, 'direction' => 'in',  'local_punch_time' => '2026-07-07 13:00:00'],
            (object)['id' => 6, 'direction' => 'out', 'local_punch_time' => '2026-07-07 18:00:00'],
        ]);
        $build  = $svc->buildTimeline($events, false);
        $interp = $svc->interpretTimeline($build['timeline'], '2026-07-07');

        // The break start must be the last consecutive OUT (12:02)
        $this->assertCount(1, $interp['completed_breaks']);
        $this->assertEquals('2026-07-07 12:02:00', $interp['completed_breaks'][0]['start']->format('Y-m-d H:i:s'));
        $this->assertEquals('2026-07-07 13:00:00', $interp['completed_breaks'][0]['end']->format('Y-m-d H:i:s'));
    }

    /** @test */
    public function test_multiple_completed_breaks()
    {
        $svc    = new BiometricTimelineService();
        $events = collect([
            (object)['id' => 1, 'direction' => 'in',  'local_punch_time' => '2026-07-07 09:00:00'],
            (object)['id' => 2, 'direction' => 'out', 'local_punch_time' => '2026-07-07 10:00:00'],
            (object)['id' => 3, 'direction' => 'in',  'local_punch_time' => '2026-07-07 10:15:00'],
            (object)['id' => 4, 'direction' => 'out', 'local_punch_time' => '2026-07-07 12:00:00'],
            (object)['id' => 5, 'direction' => 'in',  'local_punch_time' => '2026-07-07 13:00:00'],
            (object)['id' => 6, 'direction' => 'out', 'local_punch_time' => '2026-07-07 18:00:00'],
        ]);
        $build  = $svc->buildTimeline($events, false);
        $interp = $svc->interpretTimeline($build['timeline'], '2026-07-07');

        $this->assertCount(2, $interp['completed_breaks']);
        $this->assertEquals(15,  $interp['completed_breaks'][0]['minutes']); // 10:00â€“10:15
        $this->assertEquals(60,  $interp['completed_breaks'][1]['minutes']); // 12:00â€“13:00
        // Working: 60 + 105 + 300 = 465 minutes
        $this->assertEquals(465, $interp['total_working_minutes']);
    }

    /** @test */
    public function test_open_break_active_on_current_day_today()
    {
        $today  = Carbon::today()->format('Y-m-d');
        $svc    = new BiometricTimelineService();
        $events = collect([
            (object)['id' => 1, 'direction' => 'in',  'local_punch_time' => "{$today} 09:00:00"],
            (object)['id' => 2, 'direction' => 'out', 'local_punch_time' => "{$today} 10:00:00"],
            // Employee is still on break â€” no return IN yet
        ]);
        $build  = $svc->buildTimeline($events, false);
        $interp = $svc->interpretTimeline($build['timeline'], $today);

        $this->assertFalse($interp['is_currently_working']);
        // last_out = 10:00 (the break start on current day)
        $this->assertNotNull($interp['last_out']);
        // open_break_start is set when outside + today
        $this->assertNotNull($interp['open_break_start']);
    }

    /** @test */
    public function test_historical_missing_out_flagged_as_requires_review()
    {
        $svc    = new BiometricTimelineService();
        $events = collect([
            (object)['id' => 1, 'direction' => 'in', 'local_punch_time' => '2026-06-01 09:00:00'],
        ]);
        $build  = $svc->buildTimeline($events, false);
        $interp = $svc->interpretTimeline($build['timeline'], '2026-06-01');

        $this->assertTrue($interp['has_missing_punch_out']);
        $this->assertTrue($interp['requires_review']);
        $this->assertFalse($interp['is_currently_working']);
    }

    /** @test */
    public function test_cross_midnight_returns_error_when_open_previous_shift_exists()
    {
        $svc    = new BiometricTimelineService();
        $events = collect([
            (object)['id' => 1, 'direction' => 'out', 'local_punch_time' => '2026-07-07 06:00:00'],
            (object)['id' => 2, 'direction' => 'in',  'local_punch_time' => '2026-07-07 09:00:00'],
        ]);
        $build  = $svc->buildTimeline($events, hasOpenPreviousShift: true);

        $this->assertFalse($build['ok']);
        $this->assertEquals('cross_midnight_review', $build['error']);
        $this->assertTrue($build['cross_midnight']);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Timezone serialization test
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /** @test */
    public function test_timezone_output_is_kolkata_offset_for_known_production_punch()
    {
        // Simulates: DB stores '2026-07-07 10:33:16' in a timestamp without timezone col.
        // Eloquent attaches UTC. shiftTimezone must produce +05:30 WITHOUT moving the hour.
        $storedAsUtc  = Carbon::parse('2026-07-07 10:33:16', 'UTC');
        $shifted      = (clone $storedAsUtc)->shiftTimezone('Asia/Kolkata');

        $this->assertEquals('2026-07-07T10:33:16+05:30', $shifted->toIso8601String(),
            'shiftTimezone must preserve hour digits and add +05:30 offset');

        // Compare with wrong operation
        $wrongShift   = (clone $storedAsUtc)->setTimezone('Asia/Kolkata');
        $this->assertEquals('2026-07-07T16:03:16+05:30', $wrongShift->toIso8601String(),
            'setTimezone (wrong) moves the hour digits â€” this is the double-conversion bug');
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Full processor integration tests (using DB via RefreshDatabase)
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public function test_regression_day_begins_in_unchanged()
    {
        $user   = User::factory()->create(['employee_code' => 'EMP_A']);
        $event1 = $this->makeEvent('EMP_A', '2026-07-07 09:00:00', 'in');
        $event2 = $this->makeEvent('EMP_A', '2026-07-07 18:00:00', 'out');

        $res = $this->processor()->processEvents([$event1->id, $event2->id]);

        $this->assertEquals(2, $res['processed']);
        $att = Attendance::where('user_id', $user->id)->where('date', '2026-07-07')->first();
        $this->assertNotNull($att);
        $this->assertEquals('2026-07-07 09:00:00', $att->check_in_time);
        $this->assertEquals('2026-07-07 18:00:00', $att->check_out_time);
        $this->assertEquals('processed', $event1->fresh()->processing_status);
        $this->assertEquals('processed', $event2->fresh()->processing_status);
    }

    public function test_regression_day_begins_with_stray_out()
    {
        $user   = User::factory()->create(['employee_code' => 'EMP_B']);
        $event1 = $this->makeEvent('EMP_B', '2026-07-07 08:30:00', 'out');
        $event2 = $this->makeEvent('EMP_B', '2026-07-07 09:00:00', 'in');
        $event3 = $this->makeEvent('EMP_B', '2026-07-07 18:00:00', 'out');

        $res = $this->processor()->processEvents([$event1->id, $event2->id, $event3->id]);

        $this->assertEquals(3, $res['processed']);
        $att = Attendance::where('user_id', $user->id)->where('date', '2026-07-07')->first();
        $this->assertEquals('2026-07-07 09:00:00', $att->check_in_time);
        $this->assertEquals('2026-07-07 18:00:00', $att->check_out_time);
        $this->assertEquals('ignored',           $event1->fresh()->processing_status);
        $this->assertEquals('orphan_leading_out', $event1->fresh()->error_reason);
        $this->assertEquals('processed',         $event2->fresh()->processing_status);
        $this->assertEquals('processed',         $event3->fresh()->processing_status);
    }

    public function test_regression_day_begins_with_multiple_outs()
    {
        $user   = User::factory()->create(['employee_code' => 'EMP_C']);
        $event1 = $this->makeEvent('EMP_C', '2026-07-07 08:20:00', 'out');
        $event2 = $this->makeEvent('EMP_C', '2026-07-07 08:25:00', 'out');
        $event3 = $this->makeEvent('EMP_C', '2026-07-07 09:00:00', 'in');
        $event4 = $this->makeEvent('EMP_C', '2026-07-07 18:00:00', 'out');

        $res = $this->processor()->processEvents([$event1->id, $event2->id, $event3->id, $event4->id]);

        $this->assertEquals(4, $res['processed']);
        $att = Attendance::where('user_id', $user->id)->where('date', '2026-07-07')->first();
        $this->assertNotNull($att);
        $this->assertEquals('2026-07-07 09:00:00', $att->check_in_time);
        $this->assertEquals('ignored', $event1->fresh()->processing_status);
        $this->assertEquals('ignored', $event2->fresh()->processing_status);
    }

    public function test_regression_only_out_events()
    {
        $user   = User::factory()->create(['employee_code' => 'EMP_D']);
        $event1 = $this->makeEvent('EMP_D', '2026-07-07 09:00:00', 'out');
        $event2 = $this->makeEvent('EMP_D', '2026-07-07 18:00:00', 'out');

        $res = $this->processor()->processEvents([$event1->id, $event2->id]);

        $this->assertEquals(0, $res['processed']);
        $this->assertEquals(2, $res['errors']);
        $this->assertNull(Attendance::where('user_id', $user->id)->where('date', '2026-07-07')->first());
        $this->assertEquals('error',            $event1->fresh()->processing_status);
        $this->assertEquals('invalid_sequence', $event1->fresh()->error_reason);
    }

    public function test_regression_cross_midnight_protection()
    {
        $user = User::factory()->create(['employee_code' => 'EMP_E']);
        Attendance::create([
            'user_id'        => $user->id,
            'date'           => '2026-07-06',
            'check_in_time'  => '2026-07-06 22:00:00',
            'check_out_time' => null,
            'source'         => 'biometric',
        ]);
        $event1 = $this->makeEvent('EMP_E', '2026-07-07 06:00:00', 'out');
        $event2 = $this->makeEvent('EMP_E', '2026-07-07 09:00:00', 'in');

        $res = $this->processor()->processEvents([$event1->id, $event2->id]);

        $this->assertEquals(0, $res['processed']);
        $this->assertEquals(2, $res['errors']);
        $this->assertNull(Attendance::where('user_id', $user->id)->where('date', '2026-07-07')->first());
        $this->assertEquals('error',                'error', $event1->fresh()->processing_status);
        $this->assertEquals('cross_midnight_review', $event1->fresh()->error_reason);
    }

    public function test_manual_attendance_conflict_protection()
    {
        $user = User::factory()->create(['employee_code' => 'EMP_F']);
        Attendance::create([
            'user_id'        => $user->id,
            'date'           => '2026-07-07',
            'check_in_time'  => '2026-07-07 10:00:00',
            'check_out_time' => '2026-07-07 17:00:00',
            'source'         => 'manual',
        ]);
        $event1 = $this->makeEvent('EMP_F', '2026-07-07 09:00:00', 'in');

        $res = $this->processor()->processEvents([$event1->id]);

        $this->assertEquals(0, $res['processed']);
        $this->assertEquals(1, $res['errors']);
        $this->assertEquals('error',                     $event1->fresh()->processing_status);
        $this->assertEquals('manual_attendance_conflict', $event1->fresh()->error_reason);
    }

    public function test_reprocessing_is_idempotent()
    {
        $user   = User::factory()->create(['employee_code' => 'EMP_G']);
        $event1 = $this->makeEvent('EMP_G', '2026-07-07 09:00:00', 'in');
        $event2 = $this->makeEvent('EMP_G', '2026-07-07 12:00:00', 'out');
        $event3 = $this->makeEvent('EMP_G', '2026-07-07 13:00:00', 'in');
        $event4 = $this->makeEvent('EMP_G', '2026-07-07 18:00:00', 'out');

        $svc = $this->processor();
        $res1 = $svc->processEvents([$event1->id, $event2->id, $event3->id, $event4->id]);
        $this->assertEquals(4, $res1['processed']);

        $att = Attendance::where('user_id', $user->id)->where('date', '2026-07-07')->first();
        $this->assertNotNull($att);
        $this->assertCount(1, AttendanceBreak::where('attendance_id', $att->id)->get());

        $res2 = $svc->processEvents([$event1->id, $event2->id, $event3->id, $event4->id]);
        $this->assertEquals(4, $res2['processed']);
        $this->assertEquals(1, Attendance::where('user_id', $user->id)->where('date', '2026-07-07')->count());
        $this->assertCount(1, AttendanceBreak::where('attendance_id', $att->id)->get());
    }

    public function test_consecutive_duplicate_in_out()
    {
        $user   = User::factory()->create(['employee_code' => 'EMP_H']);
        $event1 = $this->makeEvent('EMP_H', '2026-07-07 09:00:00', 'in');
        $event2 = $this->makeEvent('EMP_H', '2026-07-07 09:05:00', 'in');   // dup IN
        $event3 = $this->makeEvent('EMP_H', '2026-07-07 18:00:00', 'out');
        $event4 = $this->makeEvent('EMP_H', '2026-07-07 18:05:00', 'out');  // dup OUT

        $res = $this->processor()->processEvents([$event1->id, $event2->id, $event3->id, $event4->id]);

        $this->assertEquals(4, $res['processed']);
        $att = Attendance::where('user_id', $user->id)->where('date', '2026-07-07')->first();
        $this->assertNotNull($att);
        $this->assertEquals('2026-07-07 09:00:00', $att->check_in_time);  // earliest IN
        $this->assertEquals('2026-07-07 18:05:00', $att->check_out_time); // latest OUT
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Production-shaped fixture (Employee Code 231)
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public function test_production_shaped_fixture_employee_231()
    {
        $user    = User::factory()->create(['employee_code' => '231']);
        $punches = [
            ['10:25:35', 'out'], ['10:25:37', 'out'], ['10:26:26', 'out'],
            ['10:33:16', 'in'],
            ['11:05:27', 'out'],
            ['11:15:55', 'in'],
            ['12:36:11', 'out'], ['12:36:12', 'out'], ['12:37:27', 'out'],
            ['12:41:34', 'in'], ['12:41:49', 'in'],
            ['13:06:47', 'out'],
            ['13:41:30', 'in'],
            ['14:13:15', 'out'],
            ['14:16:45', 'in'],
            ['15:33:23', 'out'], ['15:33:24', 'out'],
            ['15:40:25', 'in'],
            ['16:30:13', 'out'], // Later final OUT
        ];

        $eventIds = [];
        foreach ($punches as $idx => $p) {
            $evt = BiometricEvent::create([
                'source_system'    => 'essl',
                'source_table'     => 'DeviceLogs_7_2026',
                'source_event_id'  => (string)(2000 + $idx),
                'employee_code'    => '231',
                'local_punch_time' => '2026-07-07 ' . $p[0],
                'direction'        => $p[1],
                'device_id'        => '20',
                'source_timezone'  => 'Asia/Kolkata',
                'utc_punch_time'   => '2026-07-07 ' . $p[0],
                'processing_status' => 'pending',
            ]);
            $eventIds[] = $evt->id;
        }

        $res = $this->processor()->processEvents($eventIds);

        $this->assertEquals(19, $res['processed']);
        $this->assertEquals(0,  $res['errors']);

        $att = Attendance::where('user_id', $user->id)->where('date', '2026-07-07')->first();
        $this->assertNotNull($att);

        // First valid IN is 10:33:16 (the three leading OUTs are orphans)
        $this->assertEquals('2026-07-07 10:33:16', $att->check_in_time,
            'First IN must be 10:33:16, the earliest valid punch after orphan leading OUTs');
        // Last OUT is 16:30:13 (after the IN at 15:40:25)
        $this->assertEquals('2026-07-07 16:30:13', $att->check_out_time,
            'Last OUT must be 16:30:13, the latest punch that closed the final session');

        // Three leading OUTs must be orphan
        for ($i = 0; $i < 3; $i++) {
            $evt = BiometricEvent::find($eventIds[$i]);
            $this->assertEquals('ignored',           $evt->processing_status);
            $this->assertEquals('orphan_leading_out', $evt->error_reason);
        }

        // Exactly 5 completed breaks (final OUT at 16:30:13 is not a break end, no IN follows)
        $breaks = AttendanceBreak::where('attendance_id', $att->id)->orderBy('break_start')->get();
        $this->assertCount(5, $breaks);

        $this->assertEquals('2026-07-07 11:05:27', $breaks[0]->break_start);
        $this->assertEquals('2026-07-07 11:15:55', $breaks[0]->break_end);

        $this->assertEquals('2026-07-07 12:37:27', $breaks[1]->break_start); // last of consecutive OUTs before first IN
        $this->assertEquals('2026-07-07 12:41:34', $breaks[1]->break_end);

        $this->assertEquals('2026-07-07 13:06:47', $breaks[2]->break_start);
        $this->assertEquals('2026-07-07 13:41:30', $breaks[2]->break_end);

        $this->assertEquals('2026-07-07 14:13:15', $breaks[3]->break_start);
        $this->assertEquals('2026-07-07 14:16:45', $breaks[3]->break_end);

        $this->assertEquals('2026-07-07 15:33:24', $breaks[4]->break_start); // last of 2 consecutive OUTs
        $this->assertEquals('2026-07-07 15:40:25', $breaks[4]->break_end);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Attendance index scope tests
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /** @test */
    public function test_employee_index_returns_only_own_attendance()
    {
        $emp     = User::factory()->create(['employee_code' => 'E1']);
        $emp->assignRole('Employee');
        $other   = User::factory()->create(['employee_code' => 'E2']);
        $other->assignRole('Employee');

        Attendance::create(['user_id' => $emp->id,   'date' => '2026-07-07', 'check_in_time' => '2026-07-07 09:00:00', 'status' => 'Present', 'source' => 'manual']);
        Attendance::create(['user_id' => $other->id, 'date' => '2026-07-07', 'check_in_time' => '2026-07-07 10:00:00', 'status' => 'Present', 'source' => 'manual']);

        $response = $this->actingAs($emp)->getJson('/api/attendance?month=2026-07');
        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->toArray();

        $ownAtt = Attendance::where('user_id', $emp->id)->first();
        $this->assertContains($ownAtt->id, $ids);
        $otherAtt = Attendance::where('user_id', $other->id)->first();
        $this->assertNotContains($otherAtt->id, $ids);
    }

    /** @test */
    public function test_team_lead_index_does_not_return_unrelated_employee_attendance()
    {
        $lead    = User::factory()->create(['employee_code' => 'TL1']);
        $lead->assignRole('Team Lead');

        $member  = User::factory()->create(['employee_code' => 'M1', 'team_id' => null]);
        $unrelated = User::factory()->create(['employee_code' => 'M2', 'team_id' => null]);
        $unrelated->assignRole('Employee');

        // Create a team led by $lead, member belongs to it
        $team = Team::create(['name' => 'TeamA', 'team_lead_id' => $lead->id]);
        $member->update(['team_id' => $team->id]);

        Attendance::create(['user_id' => $lead->id,      'date' => '2026-07-07', 'check_in_time' => '2026-07-07 09:00:00', 'status' => 'Present', 'source' => 'manual']);
        Attendance::create(['user_id' => $member->id,    'date' => '2026-07-07', 'check_in_time' => '2026-07-07 10:00:00', 'status' => 'Present', 'source' => 'manual']);
        Attendance::create(['user_id' => $unrelated->id, 'date' => '2026-07-07', 'check_in_time' => '2026-07-07 11:00:00', 'status' => 'Present', 'source' => 'manual']);

        $response = $this->actingAs($lead)->getJson('/api/attendance?month=2026-07');
        $response->assertOk();
        $returnedUserIds = collect($response->json('data'))->pluck('user.id')->toArray();

        $this->assertContains($lead->id,   $returnedUserIds, 'Team Lead should see own records');
        $this->assertContains($member->id, $returnedUserIds, 'Team Lead should see team member records');
        $this->assertNotContains($unrelated->id, $returnedUserIds, 'Team Lead must NOT see unrelated employee records');
    }

    /** @test */
    public function test_multi_user_attendance_response_includes_employee_identity()
    {
        $lead   = User::factory()->create(['employee_code' => 'TL2']);
        $lead->assignRole('Team Lead');
        $member = User::factory()->create(['employee_code' => 'M3', 'first_name' => 'TestName', 'last_name' => 'Employee']);

        $team = Team::create(['name' => 'TeamB', 'team_lead_id' => $lead->id]);
        $member->update(['team_id' => $team->id]);

        Attendance::create(['user_id' => $member->id, 'date' => '2026-07-07', 'check_in_time' => '2026-07-07 09:00:00', 'status' => 'Present', 'source' => 'manual']);

        $response = $this->actingAs($lead)->getJson('/api/attendance?month=2026-07');
        $response->assertOk();

        $data = collect($response->json('data'));
        $memberRecord = $data->firstWhere('user.id', $member->id);
        $this->assertNotNull($memberRecord, 'Response must contain member attendance record');
        $this->assertEquals('TestName',  $memberRecord['user']['first_name']);
        $this->assertEquals('Employee',  $memberRecord['user']['last_name']);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Attendance Details endpoint authorization tests
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /** @test */
    public function test_employee_cannot_access_another_employees_details()
    {
        $emp1 = User::factory()->create(['employee_code' => 'E10']);
        $emp1->assignRole('Employee');
        $emp2 = User::factory()->create(['employee_code' => 'E11']);
        $emp2->assignRole('Employee');

        $response = $this->actingAs($emp1)->getJson("/api/attendance/details?date=2026-07-07&user_id={$emp2->id}");
        $response->assertForbidden();
    }

    /** @test */
    public function test_team_lead_cannot_access_unrelated_employee_details()
    {
        $lead = User::factory()->create(['employee_code' => 'TL10']);
        $lead->assignRole('Team Lead');
        $unrelated = User::factory()->create(['employee_code' => 'M99']);
        $unrelated->assignRole('Employee');

        $response = $this->actingAs($lead)->getJson("/api/attendance/details?date=2026-07-07&user_id={$unrelated->id}");
        $response->assertForbidden();
    }

    /** @test */
    public function test_team_lead_can_access_own_team_member_details()
    {
        $lead   = User::factory()->create(['employee_code' => 'TL11']);
        $lead->assignRole('Team Lead');
        $member = User::factory()->create(['employee_code' => 'M100']);

        $team = Team::create(['name' => 'TeamC', 'team_lead_id' => $lead->id]);
        $member->update(['team_id' => $team->id]);

        $event = BiometricEvent::create([
            'source_system'    => 'essl',
            'source_table'     => 'DeviceLogs',
            'source_event_id'  => '9001',
            'employee_code'    => 'M100',
            'user_id'          => $member->id,
            'local_punch_time' => '2026-07-07 09:00:00',
            'direction'        => 'in',
            'device_id'        => 'DEV1',
            'source_timezone'  => 'Asia/Kolkata',
            'utc_punch_time'   => '2026-07-07 03:30:00',
            'processing_status' => 'processed',
            'mapping_status'   => 'mapped',
        ]);

        $response = $this->actingAs($lead)->getJson("/api/attendance/details?date=2026-07-07&user_id={$member->id}");
        $response->assertOk();
    }

    /** @test */
    public function test_details_date_validation_rejects_invalid_format()
    {
        $user = User::factory()->create();
        $user->assignRole('Employee');

        $response = $this->actingAs($user)->getJson('/api/attendance/details?date=07-07-2026');
        $response->assertUnprocessable();
    }
}

