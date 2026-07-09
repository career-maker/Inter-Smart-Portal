const fs = require('fs');

// 1. Rewrite db.js
const dbJs = fs.readFileSync('essl-agent/db.js', 'utf8');
let newDbJs = dbJs.replace(/function getTargetTables\(lookbackDays\) \{[\s\S]*?return tables;\n\}/, `function getTargetTables() {
    const tables = [];
    const now = new Date();
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevTable = \`DeviceLogs_\${prevDate.getMonth() + 1}_\${prevDate.getFullYear()}\`;
    const currentTable = \`DeviceLogs_\${now.getMonth() + 1}_\${now.getFullYear()}\`;
    
    tables.push(prevTable);
    tables.push(currentTable);
    return tables;
}`);

newDbJs = newDbJs.replace(/async function fetchEvents\(lookbackDays\) \{[\s\S]*?const tables = getTargetTables\(lookbackDays\);/, `async function fetchEvents(syncState) {
    const allEvents = [];
    const tables = getTargetTables();`);

newDbJs = newDbJs.replace(/WHERE LogDate >= DATEADD\(day, -\$\{parseInt\(lookbackDays, 10\)\}, GETDATE\(\)\)[\s\S]*?ORDER BY LogDate ASC, DeviceLogId ASC/, `WHERE DeviceLogId > \${syncState[table] || 0}
            ORDER BY DeviceLogId ASC`);

fs.writeFileSync('essl-agent/db.js', newDbJs);

// 2. Rewrite agent.js
let agentJs = fs.readFileSync('essl-agent/agent.js', 'utf8');
agentJs = agentJs.replace(/const LOOKBACK_DAYS.*?;/, `const fs = require('fs');
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
}`);

agentJs = agentJs.replace(/let dbResults;\s*try \{\s*dbResults = await fetchEvents\(LOOKBACK_DAYS\);\s*\} catch \(err\) \{[\s\S]*?\}/, `const syncState = loadSyncState();
    let dbResults;
    try {
        dbResults = await fetchEvents(syncState);
    } catch (err) {
        console.error('[AGENT] Fatal database error:', err.message);
        process.exit(1);
    }`);

agentJs = agentJs.replace(/let successCount = 0;[\s\S]*?process.exit\(0\); \/\/ Execute exactly once and terminate/, `let successCount = 0;
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
                    console.error(\`[AGENT] Event \${event.source_event_id} failed or unacknowledged. Halting checkpoint advancement for \${event.source_table}.\`);
                    batchSuccess = false;
                    break;
                }
            }
            saveSyncState(syncState);
            if (batchSuccess) successCount++;
            else break; // Stop processing further batches if we hit a contiguous block failure
        } else {
            console.error(\`[API] Batch \${i+1} failed completely. Aborting remaining batches.\`);
            break;
        }
    }

    console.log(\`[AGENT] Sync complete. \${successCount}/\${batchesToSend} batches succeeded.\`);
    process.exit(0);`);

fs.writeFileSync('essl-agent/agent.js', agentJs);
