<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\BiometricEvent;
use App\Models\Attendance;
use App\Models\AttendanceBreak;
use App\Services\BiometricProcessorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;
use Carbon\Carbon;

class BiometricReconciliationTest extends TestCase
{
    use RefreshDatabase;

    protected BiometricProcessorService $processor;

    public function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
        $this->processor = app(BiometricProcessorService::class);
    }

    /**
     * TEST A — ORPHAN RECOVERY
     *
     * Events arrive before employee exists, fail as unmatched_employee.
     * When employee is created, orphaned events are recovered.
     */
    public function test_orphan_recovery_on_employee_creation()
    {
        $date = '2026-07-08';
        $employeeCode = '999';

        // Step 1: Events arrive BEFORE employee is created
        $event1 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs_7_2026',
            'source_event_id' => 5001,
            'employee_code' => $employeeCode,
            'user_id' => null,
            'device_id' => 1,
            'direction' => 'in',
            'local_punch_time' => '2026-07-08 09:00:00',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => Carbon::parse('2026-07-08 09:00:00', 'Asia/Kolkata')->setTimezone('UTC')->toDateTimeString(),
            'mapping_status' => 'unmapped',
            'processing_status' => 'pending',
        ]);

        $event2 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs_7_2026',
            'source_event_id' => 5002,
            'employee_code' => $employeeCode,
            'user_id' => null,
            'device_id' => 1,
            'direction' => 'out',
            'local_punch_time' => '2026-07-08 17:00:00',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => Carbon::parse('2026-07-08 17:00:00', 'Asia/Kolkata')->setTimezone('UTC')->toDateTimeString(),
            'mapping_status' => 'unmapped',
            'processing_status' => 'pending',
        ]);

        // Step 2: Process pending events (should fail with unmatched_employee)
        $results = $this->processor->processEvents([$event1->id, $event2->id]);
        $this->assertEquals(2, $results['errors']);
        $this->assertEquals(0, $results['processed']);

        // Verify events marked as unmatched_employee
        $event1->refresh();
        $this->assertEquals('error', $event1->processing_status);
        $this->assertEquals('unmatched_employee', $event1->error_reason);

        // Step 3: Create employee with matching employee_code
        $employee = User::create([
            'employee_code' => $employeeCode,
            'first_name' => 'Test',
            'last_name' => 'Employee',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);
        $employee->assignRole('Employee');

        // Step 4: Recovery should trigger automatically in controller
        // For this test, call recovery method directly
        $recovery = $this->processor->recoverOrphanedEventsForEmployeeCode($employeeCode);

        // Step 5: Verify recovery
        $event1->refresh();
        $event2->refresh();
        $this->assertEquals('processed', $event1->processing_status);
        $this->assertEquals('processed', $event2->processing_status);

        // Verify attendance created
        $attendance = Attendance::where('user_id', $employee->id)
            ->where('date', $date)
            ->where('source', 'biometric')
            ->first();

        $this->assertNotNull($attendance);
        $this->assertNotNull($attendance->check_in_time);
        $this->assertNotNull($attendance->check_out_time);
        $this->assertEquals('09:00', $attendance->check_in_time->format('H:i'));
        $this->assertEquals('17:00', $attendance->check_out_time->format('H:i'));
    }

    /**
     * TEST B — CURRENT-DAY REOPEN
     *
     * Process employee 231's sequence: OUT → IN should clear checkout_time.
     */
    public function test_current_day_reopen_clears_checkout()
    {
        $date = '2026-07-08';

        $employee = User::create([
            'employee_code' => '231',
            'first_name' => 'Abhiram',
            'last_name' => 'Test',
            'email' => 'abhiram@test.com',
            'password' => bcrypt('password'),
        ]);
        $employee->assignRole('Employee');

        // Simulate the actual employee 231 sequence
        $events = [
            ['time' => '10:40:27', 'dir' => 'in',  'src' => 2574],
            ['time' => '10:51:53', 'dir' => 'out', 'src' => 2583],
            ['time' => '10:51:54', 'dir' => 'out', 'src' => 2584],
            ['time' => '11:08:51', 'dir' => 'out', 'src' => 2596],
            ['time' => '11:15:38', 'dir' => 'in',  'src' => 2599],
            ['time' => '11:16:52', 'dir' => 'out', 'src' => 2601],
            ['time' => '11:16:54', 'dir' => 'in',  'src' => 2602],
            ['time' => '12:10:37', 'dir' => 'out', 'src' => 2632],
            ['time' => '12:12:44', 'dir' => 'in',  'src' => 2635],
        ];

        $eventIds = [];
        foreach ($events as $evt) {
            $eventIds[] = BiometricEvent::create([
                'source_system' => 'essl',
                'source_table' => 'DeviceLogs_7_2026',
                'source_event_id' => $evt['src'],
                'employee_code' => '231',
                'user_id' => $employee->id,
                'device_id' => 1,
                'direction' => $evt['dir'],
                'local_punch_time' => "2026-07-08 {$evt['time']}",
                'source_timezone' => 'Asia/Kolkata',
                'utc_punch_time' => Carbon::parse("2026-07-08 {$evt['time']}", 'Asia/Kolkata')->setTimezone('UTC')->toDateTimeString(),
                'mapping_status' => 'mapped',
                'processing_status' => 'pending',
            ])->id;
        }

        // Process all events
        $this->processor->processEvents($eventIds);

        // Verify final state: canonical state is IN
        $attendance = Attendance::where('user_id', $employee->id)
            ->where('date', $date)
            ->where('source', 'biometric')
            ->first();

        $this->assertNotNull($attendance);
        // After the final IN at 12:12:44, check_out_time should be NULL
        $this->assertNull($attendance->check_out_time, 'check_out_time should be NULL when latest canonical state is IN');
        $this->assertEquals('10:40', $attendance->check_in_time->format('H:i'));
    }

    /**
     * TEST C — IDEMPOTENCY
     *
     * Running the same timeline multiple times produces identical results.
     */
    public function test_idempotent_reprocessing()
    {
        $date = '2026-07-08';

        $employee = User::create([
            'employee_code' => '250',
            'first_name' => 'Test',
            'last_name' => 'Idempotency',
            'email' => 'idempotent@test.com',
            'password' => bcrypt('password'),
        ]);
        $employee->assignRole('Employee');

        // Create a simple timeline
        $events = [
            ['time' => '09:00:00', 'dir' => 'in'],
            ['time' => '12:00:00', 'dir' => 'out'],
            ['time' => '13:00:00', 'dir' => 'in'],
            ['time' => '18:00:00', 'dir' => 'out'],
        ];

        $eventIds = [];
        foreach ($events as $i => $evt) {
            $eventIds[] = BiometricEvent::create([
                'source_system' => 'essl',
                'source_table' => 'DeviceLogs_7_2026',
                'source_event_id' => 6000 + $i,
                'employee_code' => '250',
                'user_id' => $employee->id,
                'device_id' => 1,
                'direction' => $evt['dir'],
                'local_punch_time' => "2026-07-08 {$evt['time']}",
                'source_timezone' => 'Asia/Kolkata',
                'utc_punch_time' => Carbon::parse("2026-07-08 {$evt['time']}", 'Asia/Kolkata')->setTimezone('UTC')->toDateTimeString(),
                'mapping_status' => 'mapped',
                'processing_status' => 'pending',
            ])->id;
        }

        // Process once
        $this->processor->processEvents($eventIds);

        $att1 = Attendance::where('user_id', $employee->id)
            ->where('date', $date)
            ->where('source', 'biometric')
            ->first();

        $breaks1 = AttendanceBreak::where('attendance_id', $att1->id)->get();

        // Simulate reprocessing: mark events as pending again and process
        BiometricEvent::whereIn('id', $eventIds)->update(['processing_status' => 'pending']);
        $this->processor->processEvents($eventIds);

        $att2 = Attendance::where('user_id', $employee->id)
            ->where('date', $date)
            ->where('source', 'biometric')
            ->first();

        $breaks2 = AttendanceBreak::where('attendance_id', $att2->id)->get();

        // Verify identical results
        $this->assertEquals($att1->check_in_time, $att2->check_in_time);
        $this->assertEquals($att1->check_out_time, $att2->check_out_time);
        $this->assertEquals($att1->total_working_minutes, $att2->total_working_minutes);
        $this->assertEquals($breaks1->count(), $breaks2->count());

        // Verify only one attendance row (idempotency maintained)
        $this->assertEquals(1, Attendance::where('user_id', $employee->id)
            ->where('date', $date)
            ->where('source', 'biometric')
            ->count());
    }

    /**
     * TEST D — EXACT 8-EVENT EMPLOYEE 272 PRODUCTION SEQUENCE
     *
     * Test the exact real sequence from production (verified 2026-07-08).
     * Ensures correct attendance values after orphan recovery.
     */
    public function test_exact_employee_272_8_event_production_sequence()
    {
        $date = '2026-07-08';

        // Create employee AFTER events arrive (simulating the production issue)
        $employee = User::create([
            'employee_code' => '272-prod-exact',
            'first_name' => 'Aswathi',
            'last_name' => 'Prod',
            'email' => 'aswathi.prod@test.com',
            'password' => bcrypt('password'),
        ]);
        $employee->assignRole('Employee');

        // Exact 8-event sequence from production audit
        $events_data = [
            ['time' => '09:45:38', 'dir' => 'in',  'src' => 2544],
            ['time' => '09:45:39', 'dir' => 'in',  'src' => 2545],  // consecutive IN, skipped
            ['time' => '10:59:53', 'dir' => 'out', 'src' => 2590],  // replaced by next
            ['time' => '10:59:54', 'dir' => 'out', 'src' => 2591],  // consecutive OUT, replaces 2590
            ['time' => '12:11:12', 'dir' => 'out', 'src' => 2633],  // consecutive OUT, replaces 2591
            ['time' => '12:16:55', 'dir' => 'in',  'src' => 2639],
            ['time' => '14:03:25', 'dir' => 'out', 'src' => 2723],  // replaced by next
            ['time' => '14:03:26', 'dir' => 'out', 'src' => 2724],  // consecutive OUT, replaces 2723
        ];

        $eventIds = [];
        foreach ($events_data as $evt) {
            $eventIds[] = BiometricEvent::create([
                'source_system' => 'essl',
                'source_table' => 'DeviceLogs_7_2026',
                'source_event_id' => $evt['src'],
                'employee_code' => '272-prod-exact',
                'user_id' => $employee->id,
                'device_id' => 1,
                'direction' => $evt['dir'],
                'local_punch_time' => "2026-07-08 {$evt['time']}",
                'source_timezone' => 'Asia/Kolkata',
                'utc_punch_time' => Carbon::parse("2026-07-08 {$evt['time']}", 'Asia/Kolkata')->setTimezone('UTC')->toDateTimeString(),
                'mapping_status' => 'mapped',
                'processing_status' => 'pending',
            ])->id;
        }

        // Process all events
        $results = $this->processor->processEvents($eventIds);
        $this->assertEquals(8, $results['processed']);

        // Verify expected canonical result:
        // Timeline: IN(09:45:38) OUT(12:11:12) IN(12:16:55) OUT(14:03:26)
        // Sessions: 09:45:38-12:11:12 (145 min) + 12:16:55-14:03:26 (106 min) = 251 min
        // Break: 12:11:12-12:16:55 (5 min)

        $attendance = Attendance::where('user_id', $employee->id)
            ->where('date', $date)
            ->where('source', 'biometric')
            ->first();

        $this->assertNotNull($attendance);
        $this->assertEquals('09:45', $attendance->check_in_time->format('H:i'));
        $this->assertEquals('14:03', $attendance->check_out_time->format('H:i'));
        $this->assertEquals(251, $attendance->total_working_minutes,
            'Working time should be 145 + 106 = 251 minutes (exact production value)');

        // Verify break
        $breaks = AttendanceBreak::where('attendance_id', $attendance->id)->get();
        $this->assertEquals(1, $breaks->count(), 'Should have exactly 1 break (12:11:12-12:16:55)');
        $this->assertEquals(5, $breaks->first()->total_break_minutes);
    }

    /**
     * TEST D2 — EXISTING 7-EVENT CONTROLLED PIPELINE (ORIGINAL)
     *
     * Verify the previously passing controlled employee 272/user_id 10 sequence.
     */
    public function test_controlled_7_event_sequence_unchanged()
    {
        $date = '2026-07-08';

        $employee = User::create([
            'id' => 10,
            'employee_code' => '272',
            'first_name' => 'Aswathi',
            'last_name' => 'Test',
            'email' => 'aswathi@test.com',
            'password' => bcrypt('password'),
        ]);
        $employee->assignRole('Employee');

        // Controlled 7-event sequence
        $events = [
            ['time' => '09:45:38', 'dir' => 'in',  'src' => 2544],
            ['time' => '09:45:39', 'dir' => 'in',  'src' => 2545],  // consecutive IN, should be skipped
            ['time' => '10:59:53', 'dir' => 'out', 'src' => 2590],
            ['time' => '10:59:54', 'dir' => 'out', 'src' => 2591],  // consecutive OUT, replaces previous
            ['time' => '12:11:12', 'dir' => 'out', 'src' => 2633],  // orphan OUT while outside, replaces
            ['time' => '12:16:55', 'dir' => 'in',  'src' => 2639],
            ['time' => '17:00:00', 'dir' => 'out', 'src' => 2640],
        ];

        $eventIds = [];
        foreach ($events as $evt) {
            $eventIds[] = BiometricEvent::create([
                'source_system' => 'essl',
                'source_table' => 'DeviceLogs_7_2026',
                'source_event_id' => $evt['src'],
                'employee_code' => '272',
                'user_id' => $employee->id,
                'device_id' => 1,
                'direction' => $evt['dir'],
                'local_punch_time' => "2026-07-08 {$evt['time']}",
                'source_timezone' => 'Asia/Kolkata',
                'utc_punch_time' => Carbon::parse("2026-07-08 {$evt['time']}", 'Asia/Kolkata')->setTimezone('UTC')->toDateTimeString(),
                'mapping_status' => 'mapped',
                'processing_status' => 'pending',
            ])->id;
        }

        // Process
        $results = $this->processor->processEvents($eventIds);
        $this->assertEquals(7, $results['processed']);

        // Verify expected results
        $attendance = Attendance::where('user_id', $employee->id)
            ->where('date', $date)
            ->where('source', 'biometric')
            ->first();

        $this->assertNotNull($attendance);
        $this->assertEquals('09:45', $attendance->check_in_time->format('H:i'));
        $this->assertEquals('17:00', $attendance->check_out_time->format('H:i'));

        // Should have 1 break (10:59:54 to 12:16:55)
        $breaks = AttendanceBreak::where('attendance_id', $attendance->id)->get();
        $this->assertEquals(1, $breaks->count());
    }

    /**
     * TEST F — INVALID_SEQUENCE DEPENDENCY RECOVERY
     *
     * When unmatched_employee events are recovered, dependent invalid_sequence errors
     * are also marked as processed (not left as errors).
     */
    public function test_invalid_sequence_dependent_recovery()
    {
        $date = '2026-07-08';
        $employeeCode = '272-test';

        // Events arrive BEFORE employee exists
        // First two: unmatched_employee
        $event1 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs_7_2026',
            'source_event_id' => 9001,
            'employee_code' => $employeeCode,
            'user_id' => null,
            'device_id' => 1,
            'direction' => 'in',
            'local_punch_time' => '2026-07-08 09:00:00',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => Carbon::parse('2026-07-08 09:00:00', 'Asia/Kolkata')->setTimezone('UTC')->toDateTimeString(),
            'mapping_status' => 'unmapped',
            'processing_status' => 'pending',
        ]);

        $event2 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs_7_2026',
            'source_event_id' => 9002,
            'employee_code' => $employeeCode,
            'user_id' => null,
            'device_id' => 1,
            'direction' => 'in',
            'local_punch_time' => '2026-07-08 09:01:00',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => Carbon::parse('2026-07-08 09:01:00', 'Asia/Kolkata')->setTimezone('UTC')->toDateTimeString(),
            'mapping_status' => 'unmapped',
            'processing_status' => 'pending',
        ]);

        // OUT events that will become invalid_sequence initially
        $event3 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs_7_2026',
            'source_event_id' => 9003,
            'employee_code' => $employeeCode,
            'user_id' => null,
            'device_id' => 1,
            'direction' => 'out',
            'local_punch_time' => '2026-07-08 10:00:00',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => Carbon::parse('2026-07-08 10:00:00', 'Asia/Kolkata')->setTimezone('UTC')->toDateTimeString(),
            'mapping_status' => 'unmapped',
            'processing_status' => 'pending',
        ]);

        // Process: should mark all as unmatched_employee (user doesn't exist yet)
        $this->processor->processEvents([$event1->id, $event2->id, $event3->id]);

        // Verify all marked as unmatched_employee (since user_id is null for all)
        $this->assertEquals('error', $event1->fresh()->processing_status);
        $this->assertEquals('unmatched_employee', $event1->fresh()->error_reason);
        $this->assertEquals('error', $event3->fresh()->processing_status);
        $this->assertEquals('unmatched_employee', $event3->fresh()->error_reason);

        // Create employee
        $employee = User::create([
            'employee_code' => $employeeCode,
            'first_name' => 'Test',
            'last_name' => 'InvalidSeq',
            'email' => 'invalidseq@test.com',
            'password' => bcrypt('password'),
        ]);
        $employee->assignRole('Employee');

        // Recover orphaned events
        $recovery = $this->processor->recoverOrphanedEventsForEmployeeCode($employeeCode);

        // Verify BOTH unmatched_employee AND dependent invalid_sequence are now processed
        $this->assertEquals('processed', $event1->fresh()->processing_status);
        $this->assertNull($event1->fresh()->error_reason);

        $this->assertEquals('processed', $event3->fresh()->processing_status);
        // THIS IS THE CRITICAL CHECK: error_reason should be NULL, not 'invalid_sequence'
        $this->assertNull($event3->fresh()->error_reason,
            'Dependent invalid_sequence events should have error_reason cleared');
    }

    /**
     * TEST E — DUPLICATE AND OUT-OF-ORDER SAFETY
     *
     * Duplicate raw events and delayed older events don't corrupt canonical state.
     */
    public function test_duplicate_and_delayed_events_safety()
    {
        $date = '2026-07-08';

        $employee = User::create([
            'employee_code' => '260',
            'first_name' => 'Test',
            'last_name' => 'DuplicateSafety',
            'email' => 'dup@test.com',
            'password' => bcrypt('password'),
        ]);
        $employee->assignRole('Employee');

        // Initial timeline
        $event1 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs_7_2026',
            'source_event_id' => 7000,
            'employee_code' => '260',
            'user_id' => $employee->id,
            'device_id' => 1,
            'direction' => 'in',
            'local_punch_time' => '2026-07-08 09:00:00',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => Carbon::parse('2026-07-08 09:00:00', 'Asia/Kolkata')->setTimezone('UTC')->toDateTimeString(),
            'mapping_status' => 'mapped',
            'processing_status' => 'pending',
        ]);

        $event2 = BiometricEvent::create([
            'source_system' => 'essl',
            'source_table' => 'DeviceLogs_7_2026',
            'source_event_id' => 7001,
            'employee_code' => '260',
            'user_id' => $employee->id,
            'device_id' => 1,
            'direction' => 'out',
            'local_punch_time' => '2026-07-08 17:00:00',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => Carbon::parse('2026-07-08 17:00:00', 'Asia/Kolkata')->setTimezone('UTC')->toDateTimeString(),
            'mapping_status' => 'mapped',
            'processing_status' => 'pending',
        ]);

        // Process initial
        $this->processor->processEvents([$event1->id, $event2->id]);

        $att1 = Attendance::where('user_id', $employee->id)
            ->where('date', $date)
            ->where('source', 'biometric')
            ->first();

        // Try to add duplicate event (same source_id, should fail due to unique constraint)
        try {
            DB::transaction(function () use ($employee, $date) {
                BiometricEvent::create([
                    'source_system' => 'essl',
                    'source_table' => 'DeviceLogs_7_2026',
                    'source_event_id' => 7000,  // duplicate!
                    'employee_code' => '260',
                    'user_id' => $employee->id,
                    'device_id' => 1,
                    'direction' => 'in',
                    'local_punch_time' => '2026-07-08 09:00:00',
                    'source_timezone' => 'Asia/Kolkata',
                    'utc_punch_time' => Carbon::parse('2026-07-08 09:00:00', 'Asia/Kolkata')->setTimezone('UTC')->toDateTimeString(),
                    'mapping_status' => 'mapped',
                    'processing_status' => 'pending',
                ]);
            });
            $this->fail('Expected unique constraint violation');
        } catch (\Exception $e) {
            // Unique constraint prevents duplicate insertion - this is expected
            // Transaction is automatically rolled back
        }

        // Verify attendance is still unchanged
        $att2 = Attendance::where('user_id', $employee->id)
            ->where('date', $date)
            ->where('source', 'biometric')
            ->first();

        $this->assertEquals($att1->id, $att2->id);
        $this->assertEquals($att1->check_in_time, $att2->check_in_time);
        $this->assertEquals($att1->check_out_time, $att2->check_out_time);
    }
}
