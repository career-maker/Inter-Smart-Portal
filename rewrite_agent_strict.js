const fs = require('fs');

let agentJs = fs.readFileSync('essl-agent/agent.js', 'utf8');

// 1. Fix Fail-Closed Bootstrap and Paths
agentJs = agentJs.replace(/function loadSyncState\(\) \{[\s\S]*?return \{\};\n\}/, `function loadSyncState() {
    if (!fs.existsSync(STATE_FILE)) {
        console.error('[FATAL] sync_state.json is missing. Explicit bootstrap required to prevent historical data flooding.');
        process.exit(1);
    }
    try {
        const data = fs.readFileSync(STATE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('[FATAL] sync_state.json is corrupt or unreadable: ' + err.message);
        process.exit(1);
    }
}`);

// 2. Add Agent Lock mechanism
const lockCode = `const LOCK_FILE = path.join(__dirname, 'sync.lock');

function acquireLock() {
    try {
        fs.writeFileSync(LOCK_FILE, process.pid.toString(), { flag: 'wx' });
    } catch (err) {
        if (err.code === 'EEXIST') {
            console.log('[AGENT] Another instance is running (lock file exists). Exiting safely.');
            process.exit(0);
        }
        console.error('[FATAL] Failed to acquire lock:', err.message);
        process.exit(1);
    }
}

function releaseLock() {
    try {
        if (fs.existsSync(LOCK_FILE)) {
            fs.unlinkSync(LOCK_FILE);
        }
    } catch (err) {
        console.error('[ERROR] Failed to release lock:', err.message);
    }
}

process.on('exit', releaseLock);
process.on('SIGINT', () => { releaseLock(); process.exit(1); });
process.on('SIGTERM', () => { releaseLock(); process.exit(1); });
`;

agentJs = agentJs.replace(/function loadSyncState\(\) \{/, lockCode + '\nfunction loadSyncState() {');
agentJs = agentJs.replace(/async function run\(\) \{/, 'async function run() {\n    acquireLock();\n');

// 3. Fix HTTP 207 handling
const http207Code = `if (Array.isArray(apiResponse)) {
            let batchSuccess = true;
            for (let j = 0; j < batch.length; j++) {
                const event = batch[j];
                const apiResult = apiResponse[j];
                
                const validStatuses = ['accepted', 'unmapped_employee', 'already_exists', 'rejected_invalid'];
                
                // Index-based match guarantees exactly corresponding source_table and source_event_id logic
                if (apiResult && String(apiResult.source_event_id) === String(event.source_event_id) && validStatuses.includes(apiResult.status)) {
                    // Contiguous explicit assignment without Math.max skipping
                    syncState[event.source_table] = parseInt(event.source_event_id, 10);
                } else {
                    console.error(\`[AGENT] Event \${event.source_event_id} failed or unacknowledged (status: \${apiResult ? apiResult.status : 'missing'}). Halting checkpoint advancement for \${event.source_table}.\`);
                    batchSuccess = false;
                    break;
                }
            }
            saveSyncState(syncState);
            if (batchSuccess) successCount++;
            else break; // Stop processing further batches if we hit a contiguous block failure
        } else {
            console.error(\`[API] Batch \${i+1} failed completely (unexpected schema). Aborting remaining batches.\`);
            break;
        }`;

agentJs = agentJs.replace(/if \(apiResponse && apiResponse\.events\) \{[\s\S]*?break;\n        \}/, http207Code);

fs.writeFileSync('essl-agent/agent.js', agentJs);
