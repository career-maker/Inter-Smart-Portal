<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Database\QueryException;
use Tests\TestCase;
use App\Models\BiometricEvent;
use App\Models\User;

class BiometricFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_biometric_event_can_be_stored()
    {
        $event = BiometricEvent::create([
            'source_system' => 'eSSL',
            'source_table' => 'DeviceLogs_7_2026',
            'source_event_id' => '1001',
            'employee_code' => 'EMP001',
            'device_id' => '20',
            'direction' => 'in',
            'local_punch_time' => '2026-07-01 09:00:00',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-01 03:30:00',
        ]);

        $this->assertDatabaseHas('biometric_events', [
            'id' => $event->id,
            'source_event_id' => '1001',
        ]);
    }

    public function test_same_source_event_cannot_be_stored_twice()
    {
        $data = [
            'source_system' => 'eSSL',
            'source_table' => 'DeviceLogs_7_2026',
            'source_event_id' => '1001',
            'employee_code' => 'EMP001',
            'device_id' => '20',
            'direction' => 'in',
            'local_punch_time' => '2026-07-01 09:00:00',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-01 03:30:00',
        ];

        BiometricEvent::create($data);

        $this->expectException(QueryException::class);
        BiometricEvent::create($data); // Should violate unique constraint
    }

    public function test_same_event_id_from_different_monthly_table_can_be_stored()
    {
        BiometricEvent::create([
            'source_system' => 'eSSL',
            'source_table' => 'DeviceLogs_7_2026',
            'source_event_id' => '1001',
            'employee_code' => 'EMP001',
            'device_id' => '20',
            'direction' => 'in',
            'local_punch_time' => '2026-07-01 09:00:00',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-01 03:30:00',
        ]);

        $event2 = BiometricEvent::create([
            'source_system' => 'eSSL',
            'source_table' => 'DeviceLogs_8_2026', // Different table
            'source_event_id' => '1001',
            'employee_code' => 'EMP001',
            'device_id' => '20',
            'direction' => 'in',
            'local_punch_time' => '2026-08-01 09:00:00',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-08-01 03:30:00',
        ]);

        $this->assertDatabaseHas('biometric_events', [
            'id' => $event2->id,
            'source_table' => 'DeviceLogs_8_2026',
        ]);
    }

    public function test_employee_code_preserves_leading_zeros_as_string()
    {
        $event = BiometricEvent::create([
            'source_system' => 'eSSL',
            'source_table' => 'DeviceLogs_7_2026',
            'source_event_id' => '1002',
            'employee_code' => '001',
            'device_id' => '20',
            'direction' => 'in',
            'local_punch_time' => '2026-07-01 09:00:00',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-01 03:30:00',
        ]);

        // Fetch from DB to ensure it wasn't cast to an integer
        $fresh = $event->fresh();
        $this->assertSame('001', $fresh->employee_code);
    }

    public function test_unknown_employee_code_can_be_stored_with_null_user()
    {
        $event = BiometricEvent::create([
            'source_system' => 'eSSL',
            'source_table' => 'DeviceLogs_7_2026',
            'source_event_id' => '1003',
            'employee_code' => 'UNKNOWN_EMP',
            'user_id' => null, // Explicitly null
            'device_id' => '20',
            'direction' => 'in',
            'local_punch_time' => '2026-07-01 09:00:00',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-01 03:30:00',
        ]);

        $this->assertNull($event->user_id);
    }

    public function test_valid_directions_are_accepted()
    {
        $eventIn = BiometricEvent::create([
            'source_system' => 'eSSL',
            'source_table' => 'DeviceLogs_7_2026',
            'source_event_id' => '2001',
            'employee_code' => 'EMP001',
            'device_id' => '20',
            'direction' => 'in',
            'local_punch_time' => '2026-07-01 09:00:00',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-01 03:30:00',
        ]);

        $eventOut = BiometricEvent::create([
            'source_system' => 'eSSL',
            'source_table' => 'DeviceLogs_7_2026',
            'source_event_id' => '2002',
            'employee_code' => 'EMP001',
            'device_id' => '19',
            'direction' => 'out',
            'local_punch_time' => '2026-07-01 18:00:00',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-01 12:30:00',
        ]);

        $this->assertEquals('in', $eventIn->fresh()->direction);
        $this->assertEquals('out', $eventOut->fresh()->direction);
    }

    public function test_deleting_user_does_not_destroy_biometric_event()
    {
        $user = User::factory()->create([
            'employee_code' => 'EMP001',
        ]);

        $event = BiometricEvent::create([
            'source_system' => 'eSSL',
            'source_table' => 'DeviceLogs_7_2026',
            'source_event_id' => '1004',
            'employee_code' => 'EMP001',
            'user_id' => $user->id,
            'device_id' => '20',
            'direction' => 'in',
            'local_punch_time' => '2026-07-01 09:00:00',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-01 03:30:00',
        ]);

        $this->assertEquals($user->id, $event->user_id);

        // Delete user
        $user->delete();

        // Biometric event should still exist, and because user is soft-deleted, 
        // the foreign key still points to the user ID. If force deleted, nullOnDelete would set it to null.
        $this->assertDatabaseHas('biometric_events', [
            'id' => $event->id,
        ]);
    }

    public function test_invalid_direction_is_rejected()
    {
        $this->expectException(QueryException::class);

        BiometricEvent::create([
            'source_system' => 'eSSL',
            'source_table' => 'DeviceLogs_7_2026',
            'source_event_id' => '1005',
            'employee_code' => 'EMP001',
            'device_id' => '20',
            'direction' => 'invalid_dir', // Should trigger enum failure
            'local_punch_time' => '2026-07-01 09:00:00',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-01 03:30:00',
        ]);
    }

    public function test_invalid_status_values_are_rejected()
    {
        $this->expectException(QueryException::class);

        BiometricEvent::create([
            'source_system' => 'eSSL',
            'source_table' => 'DeviceLogs_7_2026',
            'source_event_id' => '1006',
            'employee_code' => 'EMP001',
            'device_id' => '20',
            'direction' => 'in',
            'local_punch_time' => '2026-07-01 09:00:00',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-01 03:30:00',
            'mapping_status' => 'invalid_status', // Should trigger enum failure
        ]);
    }

    public function test_biometric_event_does_not_modify_attendances()
    {
        $initialAttendances = \DB::table('attendances')->count();

        BiometricEvent::create([
            'source_system' => 'eSSL',
            'source_table' => 'DeviceLogs_7_2026',
            'source_event_id' => '1007',
            'employee_code' => 'EMP001',
            'device_id' => '20',
            'direction' => 'in',
            'local_punch_time' => '2026-07-01 09:00:00',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-01 03:30:00',
        ]);

        $this->assertEquals($initialAttendances, \DB::table('attendances')->count());
    }

    public function test_biometric_event_does_not_modify_attendance_breaks()
    {
        $initialBreaks = \DB::table('attendance_breaks')->count();

        BiometricEvent::create([
            'source_system' => 'eSSL',
            'source_table' => 'DeviceLogs_7_2026',
            'source_event_id' => '1008',
            'employee_code' => 'EMP001',
            'device_id' => '20',
            'direction' => 'in',
            'local_punch_time' => '2026-07-01 09:00:00',
            'source_timezone' => 'Asia/Kolkata',
            'utc_punch_time' => '2026-07-01 03:30:00',
        ]);

        $this->assertEquals($initialBreaks, \DB::table('attendance_breaks')->count());
    }
}
