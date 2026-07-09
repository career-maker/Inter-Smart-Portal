<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use App\Models\BiometricSyncState;

try {
    DB::transaction(function () {
        $sourceSystem = 'essl';
        $insertPayload = [
            [
                'source_system' => $sourceSystem,
                'source_table' => 'DeviceLogs_6_2026',
                'source_event_id' => '12793',
                'employee_code' => 'EMP001',
                'user_id' => null,
                'device_id' => '19',
                'direction' => 'out',
                'local_punch_time' => '2026-06-29 10:36:49',
                'source_timezone' => 'Asia/Kolkata',
                'utc_punch_time' => '2026-06-29 05:06:49',
                'mapping_status' => 'unmapped',
                'processing_status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        ];

        $bindings = [];
        $values = [];
        foreach ($insertPayload as $row) {
            $placeholders = implode(', ', array_fill(0, count($row), '?'));
            $values[] = "({$placeholders})";
            foreach ($row as $val) {
                $bindings[] = $val;
            }
        }
        
        $columns = array_keys($insertPayload[0]);
        $columnList = implode(', ', $columns);
        $valueString = implode(', ', $values);
        
        $sql = "INSERT INTO biometric_events ({$columnList}) VALUES {$valueString} ON CONFLICT (source_system, source_table, source_event_id) DO NOTHING RETURNING source_system, source_table, source_event_id";
        
        $insertedRows = DB::select($sql, $bindings);

        BiometricSyncState::updateOrCreate(
            ['source_system' => $sourceSystem, 'source_table' => 'DeviceLogs_6_2026'],
            [
                'last_attempted_sync' => now(),
                'last_successful_sync' => now(),
                'sync_status' => 'idle'
            ]
        );

        // Throw an exception so we don't actually commit this to production!
        throw new \Exception("TEST_SUCCESS");
    });
} catch (\Exception $e) {
    echo "Exception: " . $e->getMessage() . "\n";
    if ($e->getPrevious()) {
        echo "Previous: " . $e->getPrevious()->getMessage() . "\n";
    }
}
