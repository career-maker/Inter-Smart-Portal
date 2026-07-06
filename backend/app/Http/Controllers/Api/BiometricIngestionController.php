<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BiometricIngestionRequest;
use App\Models\BiometricSyncState;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class BiometricIngestionController extends Controller
{
    public function ingest(BiometricIngestionRequest $request)
    {
        try {
            $events = $request->validated()['events'];
        $sourceSystem = 'essl';

        $responses = [];
        $employeeCodes = [];
        
        $validEventsToProcess = [];
        $seenComposites = []; // for intra-batch deduplication

        // 1. Initial Parsing and Validation
        foreach ($events as $index => $event) {
            // Default response structure
            $response = [
                'source_event_id' => $event['source_event_id'] ?? null,
                'status' => 'rejected_invalid',
                '_original_index' => $index // Keep track to maintain order
            ];

            // Mandatory fields check is done by FormRequest, but we ensure structure
            if (
                !isset($event['source_table'], $event['source_event_id'], $event['direction'], $event['employee_code'], $event['device_id'], $event['local_punch_time'])
                || !is_string($event['source_table'])
                || !preg_match('/^DeviceLogs_(1[0-2]|[1-9])_20[0-9]{2}$/', $event['source_table'])
            ) {
                $responses[] = $response;
                continue;
            }

            // Direction strict validation
            $direction = strtolower($event['direction']);
            if (!in_array($direction, ['in', 'out'], true)) {
                $responses[] = $response;
                continue;
            }

            $compositeKey = $sourceSystem . '|' . $event['source_table'] . '|' . $event['source_event_id'];

            // Intra-batch duplication
            if (isset($seenComposites[$compositeKey])) {
                $response['status'] = 'already_exists';
                $responses[] = $response;
                continue;
            }

            $seenComposites[$compositeKey] = true;

            // Date processing
            try {
                $localTime = Carbon::createFromFormat('Y-m-d H:i:s', $event['local_punch_time'], 'Asia/Kolkata');
                $utcTime = clone $localTime;
                $utcTime->setTimezone('UTC');
            } catch (\Exception $e) {
                $responses[] = $response;
                continue;
            }

            // Stash for processing
            $employeeCodes[] = $event['employee_code'];
            
            $validEventsToProcess[] = [
                'event' => $event,
                'direction' => $direction,
                'local_time' => $localTime->format('Y-m-d H:i:s'),
                'utc_time' => $utcTime->format('Y-m-d H:i:s'),
                'composite_key' => $compositeKey,
                'index' => count($responses)
            ];

            // Placeholder for now
            $responses[] = $response;
        }

        if (empty($validEventsToProcess)) {
            return $this->formatResponse($responses);
        }

        // 2. Pre-check Database for Existing Events (Composite ID)
        $existingComposites = [];
        // Chunk query if too many, max 500 is fine
        $query = DB::table('biometric_events')
                   ->select('source_table', 'source_event_id')
                   ->where('source_system', $sourceSystem);
                   
        $query->where(function($q) use ($validEventsToProcess) {
            foreach ($validEventsToProcess as $item) {
                $q->orWhere(function($sub) use ($item) {
                    $sub->where('source_table', $item['event']['source_table'])
                        ->where('source_event_id', $item['event']['source_event_id']);
                });
            }
        });
        
        $existingRecords = $query->get();
        foreach ($existingRecords as $rec) {
            $existingComposites["$sourceSystem|{$rec->source_table}|{$rec->source_event_id}"] = true;
        }

        // 3. Employee Lookup
        $users = User::whereIn('employee_code', array_unique($employeeCodes))
                     ->get(['id', 'employee_code'])
                     ->keyBy('employee_code');

        // 4. Prepare Insert Payload
        $insertPayload = [];
        $attemptedComposites = [];
        $uniqueSourceTables = [];

        foreach ($validEventsToProcess as $item) {
            $compKey = $item['composite_key'];
            $idx = $item['index'];
            
            if (isset($existingComposites[$compKey])) {
                $responses[$idx]['status'] = 'already_exists';
                $uniqueSourceTables[$item['event']['source_table']] = true;
                continue;
            }

            $uniqueSourceTables[$item['event']['source_table']] = true;

            $empCode = $item['event']['employee_code'];
            $user = $users->get($empCode);
            
            $status = $user ? 'accepted' : 'unmapped_employee';
            
            $insertPayload[] = [
                'source_system' => $sourceSystem,
                'source_table' => $item['event']['source_table'],
                'source_event_id' => $item['event']['source_event_id'],
                'employee_code' => $empCode,
                'user_id' => $user ? $user->id : null,
                'device_id' => $item['event']['device_id'],
                'direction' => $item['direction'],
                'local_punch_time' => $item['local_time'],
                'source_timezone' => 'Asia/Kolkata',
                'utc_punch_time' => $item['utc_time'],
                'mapping_status' => $user ? 'mapped' : 'unmapped',
                'processing_status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ];

            $attemptedComposites[$compKey] = [
                'index' => $idx,
                'status' => $status
            ];
        }

        // 5. Database Transaction (Insert & Sync State)
        if (!empty($insertPayload) || !empty($uniqueSourceTables)) {
            DB::transaction(function () use ($insertPayload, $attemptedComposites, &$responses, $sourceSystem, $uniqueSourceTables) {
                    
                    if (!empty($insertPayload)) {
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
                    
                    // PostgreSQL raw UPSERT
                    $sql = "INSERT INTO biometric_events ({$columnList}) VALUES {$valueString} ON CONFLICT (source_system, source_table, source_event_id) DO NOTHING RETURNING source_system, source_table, source_event_id";
                    
                    $insertedRows = DB::select($sql, $bindings);
                    
                    $insertedComposites = [];
                    foreach ($insertedRows as $row) {
                        // Normalize to object property access 
                        $insertedComposites["{$row->source_system}|{$row->source_table}|{$row->source_event_id}"] = true;
                    }
                    
                    foreach ($attemptedComposites as $compKey => $meta) {
                        if (isset($insertedComposites[$compKey])) {
                            // Won the race, inserted successfully
                            $responses[$meta['index']]['status'] = $meta['status'];
                        } else {
                            // Lost the race, duplicate already existed
                            $responses[$meta['index']]['status'] = 'already_exists';
                        }
                        }
                    }

                    // Update Sync States for successfully processed source tables
                    foreach (array_keys($uniqueSourceTables) as $table) {
                        BiometricSyncState::updateOrCreate(
                            ['source_system' => $sourceSystem, 'source_table' => $table],
                            [
                                'last_attempted_sync' => now(),
                                'last_successful_sync' => now(),
                                'sync_status' => 'idle'
                            ]
                        );
                    }
                });
            }

            return $this->formatResponse($responses);
        } catch (\Throwable $e) {
            $msg = $e->getMessage();
            
            // Redact raw SQL which might contain bindings or sensitive data
            if (($sqlPos = strpos($msg, '(SQL:')) !== false || ($sqlPos = strpos($msg, '(Connection:')) !== false) {
                $msg = substr($msg, 0, $sqlPos) . '[SQL/CONNECTION REDACTED]';
            }
            
            // Redact potential employee codes
            $msg = preg_replace('/[A-Z0-9]*EMP[A-Z0-9]*/i', '[REDACTED_EMP]', $msg);
            
            $sqlState = null;
            if ($e instanceof \PDOException) {
                $sqlState = isset($e->errorInfo[0]) ? $e->errorInfo[0] : null;
            }
            
            $diagnosticPayload = json_encode([
                'class' => get_class($e),
                'code' => $e->getCode(),
                'sqlstate' => $sqlState,
                'file' => basename($e->getFile()),
                'line' => $e->getLine(),
                'message' => $msg
            ]);
            
            error_log('BIOMETRIC_INGEST_EXCEPTION: ' . $diagnosticPayload);

            throw $e;
        }
    }

    private function formatResponse($responses)
    {
        // Strip out our tracking metadata before returning
        $cleaned = array_map(function ($r) {
            unset($r['_original_index']);
            return $r;
        }, $responses);

        return response()->json($cleaned, 207);
    }
}
