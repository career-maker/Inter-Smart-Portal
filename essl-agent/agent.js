require('dotenv').config();
const { fetchEvents } = require('./db');
const { sendBatch } = require('./api');

// ---------------------------------------------------------
// SAFETY ENFORCEMENT
// ---------------------------------------------------------
const DRY_RUN = process.env.DRY_RUN !== 'false';
const CONTROLLED_TEST_MODE = process.env.CONTROLLED_TEST_MODE === 'true';
const MAX_EVENTS = parseInt(process.env.MAX_EVENTS || '0', 10);
const MAX_BATCHES = parseInt(process.env.MAX_BATCHES || '0', 10);
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '100', 10);
const fs = require('fs');
const path = require('path');
const STATE_FILE = path.join(__dirname, 'sync_state.json');

function loadSyncState() {
    if (fs.existsSync(STATE_FILE)) {
        return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
    console.log('[AGENT] No sync_state.json found. Bootstrapping with empty state.');
    return {};
}

function saveSyncState(state) {
    const tempFile = STATE_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(state, null, 2));
    fs.renameSync(tempFile, STATE_FILE);
}

if (CONTROLLED_TEST_MODE) {
    console.log('[AGENT] CONTROLLED_TEST_MODE is ENABLED. Enforcing safety guards.');
    if (DRY_RUN) {
        console.error('[FATAL] DRY_RUN must be false when CONTROLLED_TEST_MODE is true. Aborting.');
        process.exit(1);
    }
    if (MAX_EVENTS < 1 || MAX_EVENTS > 5) {
        console.error(`[FATAL] MAX_EVENTS must be between 1 and 5 in controlled test mode. Got: ${MAX_EVENTS}. Aborting.`);
        process.exit(1);
    }
    if (MAX_BATCHES !== 1) {
        console.error(`[FATAL] MAX_BATCHES must be exactly 1 in controlled test mode. Got: ${MAX_BATCHES}. Aborting.`);
        process.exit(1);
    }
    console.log(`[AGENT] Safety guards validated. Max events allowed: ${MAX_EVENTS}`);
} else if (!DRY_RUN) {
    console.error('[FATAL] Live execution is not permitted unless CONTROLLED_TEST_MODE=true. Aborting.');
    process.exit(1);
}

// ---------------------------------------------------------
// REDACTION HELPER
// ---------------------------------------------------------
function redactUserId(userId) {
    if (!userId || userId.length < 2) return '***';
    return userId.charAt(0) + '***' + userId.charAt(userId.length - 1);
}

// ---------------------------------------------------------
// MAIN EXECUTION
// ---------------------------------------------------------
async function run() {
    console.log(`[AGENT] Starting sync... DRY_RUN: ${DRY_RUN}, Lookback: ${LOOKBACK_DAYS} days`);
    
    const syncState = loadSyncState();
    let dbResults;
    try {
        dbResults = await fetchEvents(syncState);
    } catch (err) {
        console.error('[AGENT] Fatal database error:', err.message);
        process.exit(1);
    }

    const mappedEvents = [];
    let invalidDirections = 0;

    for (const result of dbResults) {
        console.log(`[AGENT] Processing ${result.rows.length} rows from ${result.table}`);
        
        for (const row of result.rows) {
            // Strict direction mapping
            const rawDirection = String(row.Direction).trim().toLowerCase();
            if (rawDirection !== 'in' && rawDirection !== 'out') {
                invalidDirections++;
                continue;
            }

            // UserId must be string
            const employeeCode = row.UserId != null ? String(row.UserId).trim() : '';
            if (!employeeCode) continue;

            mappedEvents.push({
                source_table: result.table,
                source_event_id: String(row.DeviceLogId),
                direction: rawDirection,
                employee_code: employeeCode,
                device_id: String(row.DeviceId),
                local_punch_time: String(row.LocalPunchTime)
            });
        }
    }

    console.log(`[AGENT] Mapped ${mappedEvents.length} valid events. Dropped ${invalidDirections} invalid directions.`);

    // Enforce global chronological ordering before processing boundaries
    mappedEvents.sort((a, b) => {
        // 1. local_punch_time ascending
        const timeCompare = a.local_punch_time.localeCompare(b.local_punch_time);
        if (timeCompare !== 0) return timeCompare;
        
        // 2. source_table deterministically
        const tableCompare = a.source_table.localeCompare(b.source_table);
        if (tableCompare !== 0) return tableCompare;
        
        // 3. source_event_id numerically if possible, fallback to string comparison
        return String(a.source_event_id).localeCompare(String(b.source_event_id), undefined, { numeric: true });
    });

    if (DRY_RUN) {
        console.log('[AGENT] DRY_RUN=true. Outputting safe counts and masked samples only.');
        const inCount = mappedEvents.filter(e => e.direction === 'in').length;
        const outCount = mappedEvents.filter(e => e.direction === 'out').length;
        console.log(`[AGENT] Direction Counts -> IN: ${inCount}, OUT: ${outCount}`);
        
        if (mappedEvents.length > 0) {
            const sample = mappedEvents[0];
            console.log('[AGENT] Sample mapped event (redacted):', {
                source_table: sample.source_table,
                source_event_id: sample.source_event_id,
                direction: sample.direction,
                employee_code: redactUserId(sample.employee_code),
                device_id: sample.device_id,
                local_punch_time: sample.local_punch_time
            });
        }
        console.log('[AGENT] DRY_RUN complete. Exiting cleanly.');
        process.exit(0);
    }

    // Apply CONTROLLED_TEST_MODE limits before chunking
    if (CONTROLLED_TEST_MODE && mappedEvents.length > MAX_EVENTS) {
        console.log(`[AGENT] Slicing mapped events down to ${MAX_EVENTS} (Controlled Test Mode limit).`);
        mappedEvents.length = MAX_EVENTS;
    }

    // Chunk into batches
    const batches = [];
    for (let i = 0; i < mappedEvents.length; i += BATCH_SIZE) {
        batches.push(mappedEvents.slice(i, i + BATCH_SIZE));
    }

    console.log(`[AGENT] Prepared ${batches.length} batches.`);

    // Apply CONTROLLED_TEST_MODE batch limit
    const batchesToSend = CONTROLLED_TEST_MODE ? Math.min(batches.length, MAX_BATCHES) : batches.length;

    let successCount = 0;
    for (let i = 0; i < batchesToSend; i++) {
        const batch = batches[i];
        const apiResponse = await sendBatch(batch, i + 1, batchesToSend);
        
        if (apiResponse && apiResponse.events) {
            // Process contiguous success
            let batchSuccess = true;
            for (const event of batch) {
                const apiResult = apiResponse.events.find(e => String(e.source_event_id) === String(event.source_event_id));
                if (apiResult && (apiResult.status === 'inserted' || apiResult.status === 'duplicate')) {
                    syncState[event.source_table] = Math.max(syncState[event.source_table] || 0, parseInt(event.source_event_id, 10));
                } else {
                    console.error(`[AGENT] Event ${event.source_event_id} failed or unacknowledged. Halting checkpoint advancement for ${event.source_table}.`);
                    batchSuccess = false;
                    break;
                }
            }
            saveSyncState(syncState);
            if (batchSuccess) successCount++;
            else break; // Stop processing further batches if we hit a contiguous block failure
        } else {
            console.error(`[API] Batch ${i+1} failed completely. Aborting remaining batches.`);
            break;
        }
    }

    console.log(`[AGENT] Sync complete. ${successCount}/${batchesToSend} batches succeeded.`);
    process.exit(0);
}

run();
