const fs = require('fs');

let agentJs = fs.readFileSync('essl-agent/agent.js', 'utf8');

// 1. Update acquireLock with stale lock recovery
const newAcquireLock = `function acquireLock() {
    try {
        fs.writeFileSync(LOCK_FILE, process.pid.toString(), { flag: 'wx' });
    } catch (err) {
        if (err.code === 'EEXIST') {
            try {
                const stalePid = fs.readFileSync(LOCK_FILE, 'utf8').trim();
                const execSync = require('child_process').execSync;
                // /NH removes headers, /FO CSV for easier parsing, or just check string
                const output = execSync(\`tasklist /FI "PID eq \${stalePid}" /NH\`).toString();
                if (!output.includes(stalePid)) {
                    console.log(\`[AGENT] Found stale lock for dead PID \${stalePid}. Recovering lock...\`);
                    fs.unlinkSync(LOCK_FILE);
                    fs.writeFileSync(LOCK_FILE, process.pid.toString(), { flag: 'wx' });
                    return;
                }
                console.log(\`[AGENT] Another instance is running (lock file exists for PID \${stalePid}). Exiting safely.\`);
            } catch (e) {
                console.log('[AGENT] Lock check failed or process active. Exiting safely.');
            }
            process.exit(0);
        }
        console.error('[FATAL] Failed to acquire lock:', err.message);
        process.exit(1);
    }
}`;
agentJs = agentJs.replace(/function acquireLock\(\) \{[\s\S]*?process\.exit\(1\);\n    \}\n\}/, newAcquireLock);

// 2. Wrap run() body in try/finally
agentJs = agentJs.replace(/async function run\(\) \{[\s\S]*?acquireLock\(\);/, `async function run() {
    acquireLock();
    try {`);

agentJs = agentJs.replace(/    process\.exit\(0\);\n\}/, `    } finally {
        releaseLock();
    }
}`);
// Also fix DRY_RUN early exit
agentJs = agentJs.replace(/console\.log\('\[AGENT\] DRY_RUN complete\. Exiting cleanly\.'\);\n        process\.exit\(0\);/, `console.log('[AGENT] DRY_RUN complete. Exiting cleanly.');
        return;`);

// 3. Update matching logic to include source_table
agentJs = agentJs.replace(/String\(apiResult\.source_event_id\) === String\(event\.source_event_id\) && validStatuses\.includes\(apiResult\.status\)/, `String(apiResult.source_event_id) === String(event.source_event_id) && apiResult.source_table === event.source_table && validStatuses.includes(apiResult.status)`);

fs.writeFileSync('essl-agent/agent.js', agentJs);
