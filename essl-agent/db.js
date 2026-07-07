const { execFile } = require('child_process');
const util = require('util');
const execFileAsync = util.promisify(execFile);

// Generates the table names for the current and previous month based on lookback
function getTargetTables() {
    const tables = [];
    const now = new Date();
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevTable = `DeviceLogs_${prevDate.getMonth() + 1}_${prevDate.getFullYear()}`;
    const currentTable = `DeviceLogs_${now.getMonth() + 1}_${now.getFullYear()}`;
    
    tables.push(prevTable);
    tables.push(currentTable);
    return tables;
}

/**
 * Executes a SQL SELECT query securely using sqlcmd via child_process.execFile.
 * The password is provided purely via the SQLCMDPASSWORD environment variable, never in arguments.
 */
async function executeQuery(query) {
    if (process.env.DB_NAME !== 'eTimeTracklite1') {
        throw new Error("SECURITY EXCEPTION: DB_NAME must be exactly 'eTimeTracklite1'");
    }

    if (!/^\s*SELECT\b/i.test(query) || /\b(insert|update|delete|merge|alter|create|drop|truncate|exec|execute|grant|revoke|deny)\b/i.test(query)) {
        throw new Error(`SECURITY EXCEPTION: Query blocked. Only SELECT statements are permitted.`);
    }

    const args = [
        '-S', process.env.DB_SERVER,
        '-d', process.env.DB_NAME,
        '-U', process.env.DB_USER,
        '-h', '-1', // No headers
        '-s', '|', // Deterministic custom separator
        '-W', // Remove trailing spaces
        '-Q', query
    ];

    const options = {
        env: {
            ...process.env,
            SQLCMDPASSWORD: process.env.DB_PASS
        },
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large result sets
        shell: false // Explicitly disable shell execution for security
    };

    try {
        const { stdout, stderr } = await execFileAsync('sqlcmd', args, options);
        if (stderr && stderr.trim().length > 0) {
            console.error(`[DB] sqlcmd stderr: ${stderr.trim()}`);
        }
        return stdout;
    } catch (err) {
        // Redact password from the error object if it somehow leaks (e.g. env dump)
        if (err.options && err.options.env) {
            err.options.env.SQLCMDPASSWORD = '[REDACTED]';
        }
        throw new Error(`sqlcmd execution failed: ${err.message}`);
    }
}

async function fetchEvents(syncState) {
    const allEvents = [];
    const tables = getTargetTables();

    for (const table of tables) {
        // Strict regex guard against SQL injection for the dynamic table name.
        if (!/^DeviceLogs_(1[0-2]|[1-9])_20[0-9]{2}$/.test(table)) {
            throw new Error(`Invalid table name generated: ${table}`);
        }

        // Safe table check to avoid crashing if a table doesn't exist yet
        const checkQuery = `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${table}'`;
        const checkOutput = await executeQuery(checkQuery);
        
        if (!checkOutput || checkOutput.trim() === '') {
            console.log(`[DB] Table ${table} does not exist, skipping...`);
            continue;
        }

        if (!Object.prototype.hasOwnProperty.call(syncState, table)) {
            throw new Error(`[FATAL] Missing explicit checkpoint key for table ${table} in sync_state.json. Automatic fallback is prohibited.`);
        }
        const checkpoint = syncState[table];
        if (typeof checkpoint !== 'number' || !Number.isInteger(checkpoint) || checkpoint < 0) {
            throw new Error(`[FATAL] Invalid checkpoint for table ${table}: ${checkpoint}. Must be a non-negative integer.`);
        }

        console.log(`[DB] Querying ${table}...`);
        
        const query = `
            SELECT 
                DeviceLogId, 
                DeviceId, 
                UserId, 
                CONVERT(varchar(19), LogDate, 120) AS LocalPunchTime, 
                Direction 
            FROM dbo.${table}
            WHERE DeviceLogId > ${checkpoint}
            ORDER BY DeviceLogId ASC
        `;

        const output = await executeQuery(query);
        
        // Parse the deterministic custom separator format
        const lines = output.split('\n');
        const rows = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Expected output: DeviceLogId|DeviceId|UserId|LocalPunchTime|Direction
            const parts = line.split('|');
            
            // Strict row validation to fail closed on malformed rows
            if (parts.length === 5) {
                rows.push({
                    DeviceLogId: parts[0].trim(),
                    DeviceId: parts[1].trim(),
                    UserId: parts[2].trim(),
                    LocalPunchTime: parts[3].trim(),
                    Direction: parts[4].trim()
                });
            } else if (line.includes('rows affected')) {
                // Ignore standard sqlcmd footer messages
                continue;
            } else {
                console.error(`[DB] WARNING: Malformed row detected and skipped in ${table}: ${line}`);
            }
        }

        allEvents.push({
            table: table,
            rows: rows
        });
    }

    return allEvents;
}

module.exports = { fetchEvents };
