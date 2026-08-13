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
            \Log::info('BIOMETRIC_TRACE_1_START');
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
                || !preg_match('/^DeviceLogs_(1[0-2]|0?[1-9])_20[0-9]{2}$/', $event['source_table'])
            ) {
                error_log('BIOMETRIC_REJECT_INVALID_STRUCTURE: ' . json_encode($event));
                $responses[] = $response;
                continue;
            }

            // Direction strict validation
            $direction = strtolower($event['direction']);
            if (!in_array($direction, ['in', 'out'], true)) {
                error_log('BIOMETRIC_REJECT_INVALID_DIRECTION: ' . $direction);
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
                $localTime = Carbon::parse($event['local_punch_time'], 'Asia/Kolkata');
                $utcTime = clone $localTime;
                $utcTime->setTimezone('UTC');
            } catch (\Exception $e) {
                error_log('BIOMETRIC_REJECT_INVALID_DATE: ' . $event['local_punch_time'] . ' error: ' . $e->getMessage());
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

        \Log::info('BIOMETRIC_TRACE_2_VALIDATION_DONE', ['count' => count($validEventsToProcess)]);
        // 2. Pre-check Database for Existing Events (Composite ID)
        $existingComposites = [];
        // Chunk query if too many, max 500 is fine
        $query = DB::table('biometric_events')
                   ->select('source_table', 'source_event_id')
                   ->where('source_system', $sourceSystem);
                   
        $query->where(function($q) use ($validEventsToProcess) {
            $grouped = [];
            foreach ($validEventsToProcess as $item) {
                $grouped[$item['event']['source_table']][] = $item['event']['source_event_id'];
            }
            foreach ($grouped as $table => $ids) {
                $q->orWhere(function($sub) use ($table, $ids) {
                    $sub->where('source_table', $table)
                        ->whereIn('source_event_id', $ids);
                });
            }
        });
        
        \Log::info('BIOMETRIC_TRACE_3_PRECHECK_QUERY_START');
        $existingRecords = $query->get();
        \Log::info('BIOMETRIC_TRACE_4_PRECHECK_QUERY_END', ['found' => $existingRecords->count()]);
        foreach ($existingRecords as $rec) {
            $existingComposites["$sourceSystem|{$rec->source_table}|{$rec->source_event_id}"] = true;
        }

        \Log::info('BIOMETRIC_TRACE_5_EMPLOYEE_LOOKUP_START');
        // 3. Employee Lookup
        $users = User::whereIn('employee_code', array_unique($employeeCodes))
                     ->get(['id', 'employee_code'])
                     ->keyBy('employee_code');
        \Log::info('BIOMETRIC_TRACE_6_EMPLOYEE_LOOKUP_END');

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
        \Log::info('BIOMETRIC_TRACE_7_PREPARE_PAYLOAD_END', ['payload_size' => count($insertPayload)]);
        if (!empty($insertPayload) || !empty($uniqueSourceTables)) {
            DB::transaction(function () use ($insertPayload, $attemptedComposites, &$responses, $sourceSystem, $uniqueSourceTables) {
                \Log::info('BIOMETRIC_TRACE_8_TRANSACTION_START');

                    // Initialize insertedRows to avoid undefined variable error
                    $insertedRows = [];

                    if (!empty($insertPayload)) {
                        \Log::info('BIOMETRIC_TRACE_9_INSERT_START');
                        // Use Laravel's insertOrIgnore for MySQL/PostgreSQL cross-compatibility
                        DB::table('biometric_events')->insertOrIgnore($insertPayload);
                        \Log::info('BIOMETRIC_TRACE_10_INSERT_END');

                        // Since MySQL doesn't support RETURNING, we must re-query the newly inserted rows
                        // using the composite keys we just attempted to insert.
                        $insertedRows = DB::table('biometric_events')
                            ->select('id', 'source_system', 'source_table', 'source_event_id', 'user_id', 'direction', 'local_punch_time')
                            ->where('source_system', $sourceSystem)
                            ->where(function($q) use ($insertPayload) {
                                $grouped = [];
                                foreach ($insertPayload as $row) {
                                    $grouped[$row['source_table']][] = $row['source_event_id'];
                                }
                                foreach ($grouped as $table => $ids) {
                                    $q->orWhere(function($sub) use ($table, $ids) {
                                        $sub->where('source_table', $table)
                                            ->whereIn('source_event_id', $ids);
                                    });
                                }
                            })
                            ->get();
                        \Log::info('BIOMETRIC_TRACE_11_SELECT_END');

                        $insertedComposites = [];
                        foreach ($insertedRows as $row) {
                            $insertedComposites["{$row->source_system}|{$row->source_table}|{$row->source_event_id}"] = true;
                        }

                        foreach ($attemptedComposites as $compKey => $meta) {
                            if (isset($insertedComposites[$compKey])) {
                                $responses[$meta['index']]['status'] = $meta['status'];
                            } else {
                                $responses[$meta['index']]['status'] = 'already_exists';
                            }
                        }

                        // We removed the synchronous processInsertedEventsManually call here
                        // because rebuilding timelines for 50+ events synchronously takes too long
                        // and causes the eSSL agent to timeout (Status: Network/Timeout).
                        // The scheduled 5-minute cron job (biometric:process) will handle it.
                    }



                    // Update Sync States for successfully processed source tables
                    \Log::info('BIOMETRIC_TRACE_12_SYNC_STATE_START');
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
                    \Log::info('BIOMETRIC_TRACE_13_TRANSACTION_END');
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
     * Process inserted events and rebuild the timeline instantly.
     */
    private function processInsertedEventsManually($insertedRows)
    {
        $userIdsToUpdate = [];
        $datesToUpdate = [];

        foreach ($insertedRows as $row) {
            if (!isset($row->user_id) || !$row->user_id) {
                continue;
            }
            $userIdsToUpdate[] = $row->user_id;
            $datesToUpdate[] = Carbon::parse($row->local_punch_time)->format('Y-m-d');
        }

        $userIdsToUpdate = array_unique($userIdsToUpdate);
        $datesToUpdate = array_unique($datesToUpdate);

        if (empty($userIdsToUpdate) || empty($datesToUpdate)) {
            return;
        }

        try {
            $timelineService = app(\App\Services\BiometricTimelineService::class);
            foreach ($userIdsToUpdate as $userId) {
                foreach ($datesToUpdate as $dateString) {
                    $timelineService->rebuildAttendanceForEmployee($userId, $dateString);
                }
            }
        } catch (\Exception $e) {
            \Log::error('Failed to rebuild timeline during biometric ingestion', [
                'error' => $e->getMessage(),
            ]);
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
