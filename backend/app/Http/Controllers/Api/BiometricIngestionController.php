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
        error_log('BIOMETRIC_TRACE_01_ENTERED_CONTROLLER');
        try {
            error_log('BIOMETRIC_TRACE_02_ENTERED_TRY');
            error_log('BIOMETRIC_TRACE_03_BEFORE_VALIDATED');
            $events = $request->validated()['events'];
            error_log('BIOMETRIC_TRACE_04_AFTER_VALIDATED');
        $sourceSystem = 'essl';

        $responses = [];
        $employeeCodes = [];
        
        $validEventsToProcess = [];
        $seenComposites = []; // for intra-batch deduplication

        // 1. Initial Parsing and Validation
        foreach ($events as $index => $event) {
            // Default response structure
            $response = [
                'source_table' => $event['source_table'] ?? null,
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

                    // Initialize insertedRows to avoid undefined variable error
                    $insertedRows = [];

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

                        // PostgreSQL raw UPSERT - returns composite keys of inserted rows
                        $sql = "INSERT INTO biometric_events ({$columnList}) VALUES {$valueString} ON CONFLICT (source_system, source_table, source_event_id) DO NOTHING RETURNING id, source_system, source_table, source_event_id, user_id, direction, local_punch_time";

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

                        // Trigger observer logic manually for inserted events
                        // Since raw SQL bypasses Eloquent observers, we process events here
                        $this->processInsertedEventsManually($insertedRows);
                    }

                    // Sync punch-out events to Attendance table (only if we have inserted rows)
                    if (!empty($insertedRows)) {
                        $this->syncBiometricToAttendance($insertedRows);
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
            error_log('BIOMETRIC_TRACE_99_ENTERED_CATCH');
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

    /**
     * Process inserted events manually since raw SQL insert bypasses Eloquent observers.
     * This mimics the observer logic from BiometricEventObserver.
     */
    private function processInsertedEventsManually($insertedRows)
    {
        foreach ($insertedRows as $row) {
            // Only process mapped, punch-out events (as per observer logic)
            if (!isset($row->user_id) || !$row->user_id) {
                continue;
            }

            if ($row->direction !== 'out') {
                continue;
            }

            try {
                $eventDate = Carbon::parse($row->local_punch_time)->toDateString();

                // Find or create attendance record
                $attendance = DB::table('attendances')
                    ->where('user_id', $row->user_id)
                    ->where('date', $eventDate)
                    ->first();

                if (!$attendance) {
                    // Create new attendance record
                    DB::table('attendances')->insert([
                        'user_id' => $row->user_id,
                        'date' => $eventDate,
                        'check_in_time' => $row->local_punch_time,
                        'check_out_time' => $row->local_punch_time,
                        'status' => 'Present',
                        'source' => 'biometric',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } else {
                    // Update existing attendance with check-out time if this is later
                    $existingCheckOut = $attendance->check_out_time ? Carbon::parse($attendance->check_out_time) : null;
                    $newCheckOut = Carbon::parse($row->local_punch_time);

                    if (!$existingCheckOut || $newCheckOut > $existingCheckOut) {
                        DB::table('attendances')
                            ->where('id', $attendance->id)
                            ->update([
                                'check_out_time' => $row->local_punch_time,
                                'source' => 'biometric',
                                'updated_at' => now(),
                            ]);
                    }
                }
            } catch (\Exception $e) {
                \Log::error('Failed to process inserted biometric event', [
                    'event_id' => $row->id ?? 'unknown',
                    'user_id' => $row->user_id ?? 'unknown',
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    private function syncBiometricToAttendance($insertedRows)
    {
        if (empty($insertedRows)) {
            return;
        }

        // Group inserted events by user and date to build attendance records
        $eventsByUserDate = [];
        foreach ($insertedRows as $row) {
            if (!isset($row->user_id) || !$row->user_id) {
                continue; // Skip unmapped events
            }

            $eventDate = Carbon::parse($row->local_punch_time)->toDateString();
            $key = "{$row->user_id}|{$eventDate}";

            if (!isset($eventsByUserDate[$key])) {
                $eventsByUserDate[$key] = [
                    'user_id' => $row->user_id,
                    'date' => $eventDate,
                    'events' => []
                ];
            }
            $eventsByUserDate[$key]['events'][] = $row;
        }

        \Log::info('Syncing biometric events to attendance', [
            'user_date_combinations' => count($eventsByUserDate),
        ]);

        // Process each user-date combination
        foreach ($eventsByUserDate as $item) {
            try {
                $userId = $item['user_id'];
                $date = $item['date'];
                $events = $item['events'];

                // Sort events by time
                usort($events, function ($a, $b) {
                    return strtotime($a->local_punch_time) - strtotime($b->local_punch_time);
                });

                // Extract first IN and last OUT times
                $firstInTime = null;
                $lastOutTime = null;

                foreach ($events as $event) {
                    if ($event->direction === 'in' && !$firstInTime) {
                        $firstInTime = $event->local_punch_time;
                    }
                    if ($event->direction === 'out') {
                        $lastOutTime = $event->local_punch_time;
                    }
                }

                // Find or create attendance record
                $attendance = DB::table('attendances')
                    ->where('user_id', $userId)
                    ->where('date', $date)
                    ->first();

                $updateData = [
                    'status' => 'Present',
                    'source' => 'biometric',
                    'updated_at' => now(),
                ];

                if ($firstInTime) {
                    $updateData['check_in_time'] = $firstInTime;
                }
                if ($lastOutTime) {
                    $updateData['check_out_time'] = $lastOutTime;
                }

                if (!$attendance) {
                    $updateData['user_id'] = $userId;
                    $updateData['date'] = $date;
                    $updateData['created_at'] = now();
                    DB::table('attendances')->insert($updateData);
                    \Log::info('Created attendance record from biometric', [
                        'user_id' => $userId,
                        'date' => $date,
                        'check_in' => $firstInTime,
                        'check_out' => $lastOutTime,
                    ]);
                } else {
                    DB::table('attendances')
                        ->where('id', $attendance->id)
                        ->update($updateData);
                    \Log::info('Updated attendance record from biometric', [
                        'user_id' => $userId,
                        'date' => $date,
                        'check_in' => $firstInTime,
                        'check_out' => $lastOutTime,
                    ]);
                }
            } catch (\Exception $e) {
                \Log::error('Failed to sync biometric events to attendance', [
                    'user_id' => $item['user_id'] ?? 'unknown',
                    'date' => $item['date'] ?? 'unknown',
                    'error' => $e->getMessage(),
                ]);
            }
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
