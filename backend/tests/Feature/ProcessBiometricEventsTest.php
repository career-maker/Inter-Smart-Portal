<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\BiometricEvent;
use App\Models\User;
use App\Models\Attendance;
use App\Models\AttendanceBreak;
use Illuminate\Support\Facades\Artisan;
use App\Services\BiometricProcessorService;
use Mockery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

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
 
    public function test_regression_day_begins_in_unchanged()
    {
        $user = User::factory()->create(['employee_code' => 'EMP_A']);
        $event1 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs',
            'source_event_id' => '101',
            'employee_code' => 'EMP_A',
            'local_punch_time' => '2026-07-07 09:00:00',
            'direction' => 'in',
            'device_id' => 'DEV1',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-07 03:30:00',
            'processing_status' => 'pending'
        ]);
        $event2 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs',
            'source_event_id' => '102',
            'employee_code' => 'EMP_A',
            'local_punch_time' => '2026-07-07 18:00:00',
            'direction' => 'out',
            'device_id' => 'DEV1',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-07 12:30:00',
            'processing_status' => 'pending'
        ]);
 
        $service = new BiometricProcessorService();
        $res = $service->processEvents([$event1->id, $event2->id]);
        
        $this->assertEquals(2, $res['processed']);
        $this->assertEquals(0, $res['errors']);
 
        $attendance = Attendance::where('user_id', $user->id)->where('date', '2026-07-07')->first();
        $this->assertNotNull($attendance);
        $this->assertEquals('2026-07-07 09:00:00', $attendance->check_in_time);
        $this->assertEquals('2026-07-07 18:00:00', $attendance->check_out_time);
        $this->assertEquals('processed', $event1->fresh()->processing_status);
        $this->assertEquals('processed', $event2->fresh()->processing_status);
    }
 
    public function test_regression_day_begins_with_stray_out()
    {
        $user = User::factory()->create(['employee_code' => 'EMP_B']);
        $event1 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs',
            'source_event_id' => '201',
            'employee_code' => 'EMP_B',
            'local_punch_time' => '2026-07-07 08:30:00',
            'direction' => 'out',
            'device_id' => 'DEV1',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-07 03:00:00',
            'processing_status' => 'pending'
        ]);
        $event2 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs',
            'source_event_id' => '202',
            'employee_code' => 'EMP_B',
            'local_punch_time' => '2026-07-07 09:00:00',
            'direction' => 'in',
            'device_id' => 'DEV1',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-07 03:30:00',
            'processing_status' => 'pending'
        ]);
        $event3 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs',
            'source_event_id' => '203',
            'employee_code' => 'EMP_B',
            'local_punch_time' => '2026-07-07 18:00:00',
            'direction' => 'out',
            'device_id' => 'DEV1',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-07 12:30:00',
            'processing_status' => 'pending'
        ]);
 
        $service = new BiometricProcessorService();
        $res = $service->processEvents([$event1->id, $event2->id, $event3->id]);
        
        $this->assertEquals(3, $res['processed']);
        $this->assertEquals(0, $res['errors']);
 
        $attendance = Attendance::where('user_id', $user->id)->where('date', '2026-07-07')->first();
        $this->assertNotNull($attendance);
        $this->assertEquals('2026-07-07 09:00:00', $attendance->check_in_time);
        $this->assertEquals('2026-07-07 18:00:00', $attendance->check_out_time);
        
        $this->assertEquals('ignored', $event1->fresh()->processing_status);
        $this->assertEquals('orphan_leading_out', $event1->fresh()->error_reason);
        $this->assertEquals('processed', $event2->fresh()->processing_status);
        $this->assertEquals('processed', $event3->fresh()->processing_status);
    }
 
    public function test_regression_day_begins_with_multiple_outs()
    {
        $user = User::factory()->create(['employee_code' => 'EMP_C']);
        $event1 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs',
            'source_event_id' => '301',
            'employee_code' => 'EMP_C',
            'local_punch_time' => '2026-07-07 08:20:00',
            'direction' => 'out',
            'device_id' => 'DEV1',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-07 02:50:00',
            'processing_status' => 'pending'
        ]);
        $event2 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs',
            'source_event_id' => '302',
            'employee_code' => 'EMP_C',
            'local_punch_time' => '2026-07-07 08:25:00',
            'direction' => 'out',
            'device_id' => 'DEV1',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-07 02:55:00',
            'processing_status' => 'pending'
        ]);
        $event3 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs',
            'source_event_id' => '303',
            'employee_code' => 'EMP_C',
            'local_punch_time' => '2026-07-07 09:00:00',
            'direction' => 'in',
            'device_id' => 'DEV1',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-07 03:30:00',
            'processing_status' => 'pending'
        ]);
        $event4 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs',
            'source_event_id' => '304',
            'employee_code' => 'EMP_C',
            'local_punch_time' => '2026-07-07 18:00:00',
            'direction' => 'out',
            'device_id' => 'DEV1',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-07 12:30:00',
            'processing_status' => 'pending'
        ]);
 
        $service = new BiometricProcessorService();
        $res = $service->processEvents([$event1->id, $event2->id, $event3->id, $event4->id]);
        
        $this->assertEquals(4, $res['processed']);
        $this->assertEquals(0, $res['errors']);
 
        $attendance = Attendance::where('user_id', $user->id)->where('date', '2026-07-07')->first();
        $this->assertNotNull($attendance);
        $this->assertEquals('2026-07-07 09:00:00', $attendance->check_in_time);
        
        $this->assertEquals('ignored', $event1->fresh()->processing_status);
        $this->assertEquals('ignored', $event2->fresh()->processing_status);
    }
 
    public function test_regression_only_out_events()
    {
        $user = User::factory()->create(['employee_code' => 'EMP_D']);
        $event1 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs',
            'source_event_id' => '401',
            'employee_code' => 'EMP_D',
            'local_punch_time' => '2026-07-07 09:00:00',
            'direction' => 'out',
            'device_id' => 'DEV1',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-07 03:30:00',
            'processing_status' => 'pending'
        ]);
        $event2 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs',
            'source_event_id' => '402',
            'employee_code' => 'EMP_D',
            'local_punch_time' => '2026-07-07 18:00:00',
            'direction' => 'out',
            'device_id' => 'DEV1',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-07 12:30:00',
            'processing_status' => 'pending'
        ]);
 
        $service = new BiometricProcessorService();
        $res = $service->processEvents([$event1->id, $event2->id]);
        
        $this->assertEquals(0, $res['processed']);
        $this->assertEquals(2, $res['errors']);
 
        $attendance = Attendance::where('user_id', $user->id)->where('date', '2026-07-07')->first();
        $this->assertNull($attendance);
        $this->assertEquals('error', $event1->fresh()->processing_status);
        $this->assertEquals('invalid_sequence', $event1->fresh()->error_reason);
    }
 
    public function test_regression_cross_midnight_protection()
    {
        $user = User::factory()->create(['employee_code' => 'EMP_E']);
        
        // Create an unresolved biometric check-in on the previous day
        Attendance::create([
            'user_id' => $user->id,
            'date' => '2026-07-06',
            'check_in_time' => '2026-07-06 22:00:00',
            'check_out_time' => null,
            'source' => 'biometric'
        ]);
 
        $event1 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs',
            'source_event_id' => '501',
            'employee_code' => 'EMP_E',
            'local_punch_time' => '2026-07-07 06:00:00',
            'direction' => 'out',
            'device_id' => 'DEV1',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-07 00:30:00',
            'processing_status' => 'pending'
        ]);
        $event2 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs',
            'source_event_id' => '502',
            'employee_code' => 'EMP_E',
            'local_punch_time' => '2026-07-07 09:00:00',
            'direction' => 'in',
            'device_id' => 'DEV1',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-07 03:30:00',
            'processing_status' => 'pending'
        ]);
 
        $service = new BiometricProcessorService();
        $res = $service->processEvents([$event1->id, $event2->id]);
        
        $this->assertEquals(0, $res['processed']);
        $this->assertEquals(2, $res['errors']);
 
        $attendance = Attendance::where('user_id', $user->id)->where('date', '2026-07-07')->first();
        $this->assertNull($attendance);
        $this->assertEquals('error', $event1->fresh()->processing_status);
        $this->assertEquals('cross_midnight_review', $event1->fresh()->error_reason);
    }
 
    public function test_manual_attendance_conflict_protection()
    {
        $user = User::factory()->create(['employee_code' => 'EMP_F']);
        
        // Manual attendance exists
        Attendance::create([
            'user_id' => $user->id,
            'date' => '2026-07-07',
            'check_in_time' => '2026-07-07 10:00:00',
            'check_out_time' => '2026-07-07 17:00:00',
            'source' => 'manual'
        ]);
 
        $event1 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs',
            'source_event_id' => '601',
            'employee_code' => 'EMP_F',
            'local_punch_time' => '2026-07-07 09:00:00',
            'direction' => 'in',
            'device_id' => 'DEV1',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-07 03:30:00',
            'processing_status' => 'pending'
        ]);
 
        $service = new BiometricProcessorService();
        $res = $service->processEvents([$event1->id]);
        
        $this->assertEquals(0, $res['processed']);
        $this->assertEquals(1, $res['errors']);
        
        $this->assertEquals('error', $event1->fresh()->processing_status);
        $this->assertEquals('manual_attendance_conflict', $event1->fresh()->error_reason);
    }
 
    public function test_reprocessing_is_idempotent()
    {
        $user = User::factory()->create(['employee_code' => 'EMP_G']);
        
        $event1 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs',
            'source_event_id' => '701',
            'employee_code' => 'EMP_G',
            'local_punch_time' => '2026-07-07 09:00:00',
            'direction' => 'in',
            'device_id' => 'DEV1',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-07 03:30:00',
            'processing_status' => 'pending'
        ]);
        $event2 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs',
            'source_event_id' => '702',
            'employee_code' => 'EMP_G',
            'local_punch_time' => '2026-07-07 12:00:00',
            'direction' => 'out',
            'device_id' => 'DEV1',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-07 06:30:00',
            'processing_status' => 'pending'
        ]);
        $event3 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs',
            'source_event_id' => '703',
            'employee_code' => 'EMP_G',
            'local_punch_time' => '2026-07-07 13:00:00',
            'direction' => 'in',
            'device_id' => 'DEV1',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-07 07:30:00',
            'processing_status' => 'pending'
        ]);
        $event4 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs',
            'source_event_id' => '704',
            'employee_code' => 'EMP_G',
            'local_punch_time' => '2026-07-07 18:00:00',
            'direction' => 'out',
            'device_id' => 'DEV1',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-07 12:30:00',
            'processing_status' => 'pending'
        ]);
 
        $service = new BiometricProcessorService();
        
        // First run
        $res1 = $service->processEvents([$event1->id, $event2->id, $event3->id, $event4->id]);
        $this->assertEquals(4, $res1['processed']);
        
        $attendance = Attendance::where('user_id', $user->id)->where('date', '2026-07-07')->first();
        $this->assertNotNull($attendance);
        $this->assertEquals(1, AttendanceBreak::where('attendance_id', $attendance->id)->count());
 
        // Second run (reprocess / retry by passing explicit IDs including error/processed states)
        $res2 = $service->processEvents([$event1->id, $event2->id, $event3->id, $event4->id]);
        
        $this->assertEquals(4, $res2['processed']);
        $this->assertEquals(1, Attendance::where('user_id', $user->id)->where('date', '2026-07-07')->count());
        $this->assertEquals(1, AttendanceBreak::where('attendance_id', $attendance->id)->count());
    }
 
    public function test_consecutive_duplicate_in_out()
    {
        $user = User::factory()->create(['employee_code' => 'EMP_H']);
        $event1 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs',
            'source_event_id' => '801',
            'employee_code' => 'EMP_H',
            'local_punch_time' => '2026-07-07 09:00:00',
            'direction' => 'in',
            'device_id' => 'DEV1',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-07 03:30:00',
            'processing_status' => 'pending'
        ]);
        $event2 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs',
            'source_event_id' => '802',
            'employee_code' => 'EMP_H',
            'local_punch_time' => '2026-07-07 09:05:00',
            'direction' => 'in',
            'device_id' => 'DEV1',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-07 03:35:00',
            'processing_status' => 'pending'
        ]);
        $event3 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs',
            'source_event_id' => '803',
            'employee_code' => 'EMP_H',
            'local_punch_time' => '2026-07-07 18:00:00',
            'direction' => 'out',
            'device_id' => 'DEV1',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-07 12:30:00',
            'processing_status' => 'pending'
        ]);
        $event4 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs',
            'source_event_id' => '804',
            'employee_code' => 'EMP_H',
            'local_punch_time' => '2026-07-07 18:05:00',
            'direction' => 'out',
            'device_id' => 'DEV1',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-07 12:35:00',
            'processing_status' => 'pending'
        ]);
 
        $service = new BiometricProcessorService();
        $res = $service->processEvents([$event1->id, $event2->id, $event3->id, $event4->id]);
        
        $this->assertEquals(4, $res['processed']);
        
        $attendance = Attendance::where('user_id', $user->id)->where('date', '2026-07-07')->first();
        $this->assertNotNull($attendance);
        // Earliest IN is retained (09:00:00), latest OUT is retained (18:05:00)
        $this->assertEquals('2026-07-07 09:00:00', $attendance->check_in_time);
        $this->assertEquals('2026-07-07 18:05:00', $attendance->check_out_time);
    }
 
    public function test_production_shaped_fixture_employee_231()
    {
        $user = User::factory()->create(['employee_code' => '231']);
        
        $punches = [
            ['10:25:35', 'out'],
            ['10:25:37', 'out'],
            ['10:26:26', 'out'],
            ['10:33:16', 'in'],
            ['11:05:27', 'out'],
            ['11:15:55', 'in'],
            ['12:36:11', 'out'],
            ['12:36:12', 'out'],
            ['12:37:27', 'out'],
            ['12:41:34', 'in'],
            ['12:41:49', 'in'],
            ['13:06:47', 'out'],
            ['13:41:30', 'in'],
            ['14:13:15', 'out'],
            ['14:16:45', 'in'],
            ['15:33:23', 'out'],
            ['15:33:24', 'out'],
            ['15:40:25', 'in'],
        ];
 
        $eventIds = [];
        foreach ($punches as $idx => $p) {
            $evt = BiometricEvent::create([
                'source_system' => 'essl',
                'source_table' => 'DeviceLogs_7_2026',
                'source_event_id' => (string)(2000 + $idx),
                'employee_code' => '231',
                'local_punch_time' => '2026-07-07 ' . $p[0],
                'direction' => $p[1],
                'device_id' => '20',
                'source_timezone' => 'Asia/Kolkata',
                'utc_punch_time' => '2026-07-07 ' . $p[0], // simplified for test
                'processing_status' => 'pending'
            ]);
            $eventIds[] = $evt->id;
        }
 
        $service = new BiometricProcessorService();
        $res = $service->processEvents($eventIds);
        
        $this->assertEquals(18, $res['processed']);
        $this->assertEquals(0, $res['errors']);
 
        $attendance = Attendance::where('user_id', $user->id)->where('date', '2026-07-07')->first();
        $this->assertNotNull($attendance);
        
        // Attendance check_in_time is first valid IN (10:33:16)
        $this->assertEquals('2026-07-07 10:33:16', $attendance->check_in_time);
        
        // check_out_time is null because final punch was an IN at 15:40:25
        $this->assertNull($attendance->check_out_time);
        
        // Assert that the first three OUT punches are ignored/orphan_leading_out
        for ($i = 0; $i < 3; $i++) {
            $evt = BiometricEvent::find($eventIds[$i]);
            $this->assertEquals('ignored', $evt->processing_status);
            $this->assertEquals('orphan_leading_out', $evt->error_reason);
        }
 
        // Assert that 5 breaks were created
        $breaks = AttendanceBreak::where('attendance_id', $attendance->id)->orderBy('break_start', 'asc')->get();
        $this->assertCount(5, $breaks);
        
        // Break 1: Out 11:05:27 -> In 11:15:55
        $this->assertEquals('2026-07-07 11:05:27', $breaks[0]->break_start);
        $this->assertEquals('2026-07-07 11:15:55', $breaks[0]->break_end);
        
        // Break 2: Out 12:37:27 -> In 12:41:34 (since Out 12:36:11, 12:36:12, 12:37:27 is consecutive OUT, last is retained)
        $this->assertEquals('2026-07-07 12:37:27', $breaks[1]->break_start);
        $this->assertEquals('2026-07-07 12:41:34', $breaks[1]->break_end);
        
        // Break 3: Out 13:06:47 -> In 13:41:30
        $this->assertEquals('2026-07-07 13:06:47', $breaks[2]->break_start);
        $this->assertEquals('2026-07-07 13:41:30', $breaks[2]->break_end);
        
        // Break 4: Out 14:13:15 -> In 14:16:45
        $this->assertEquals('2026-07-07 14:13:15', $breaks[3]->break_start);
        $this->assertEquals('2026-07-07 14:16:45', $breaks[3]->break_end);
        
        // Break 5: Out 15:33:24 -> In 15:40:25 (since Out 15:33:23, 15:33:24 is consecutive OUT, last is retained)
        $this->assertEquals('2026-07-07 15:33:24', $breaks[4]->break_start);
        $this->assertEquals('2026-07-07 15:40:25', $breaks[4]->break_end);
    }
}
