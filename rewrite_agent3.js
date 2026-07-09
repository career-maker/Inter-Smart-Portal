const fs = require('fs');

let agentJs = fs.readFileSync('essl-agent/agent.js', 'utf8');

// 1. Fix mappedEvents sort logic to remove local_punch_time and strictly use source_table then source_event_id
agentJs = agentJs.replace(/    mappedEvents\.sort\(\(a, b\) => \{[\s\S]*?    \}\);/, `    mappedEvents.sort((a, b) => {
        // 1. source_table deterministically
        const tableCompare = a.source_table.localeCompare(b.source_table);
        if (tableCompare !== 0) return tableCompare;
        
        // 2. source_event_id numerically
        return parseInt(a.source_event_id, 10) - parseInt(b.source_event_id, 10);
    });`);

// 2. Replace hard abort with 500-event ceiling
agentJs = agentJs.replace(/\} else if \(!DRY_RUN\) \{[\s\S]*?    process\.exit\(1\);\n\}/, `} else if (!DRY_RUN) {
    console.log('[AGENT] Live Production Mode: CONTROLLED_TEST_MODE is OFF. Enforcing permanent safety ceiling of 500 events.');
}`);

// 3. Add slicing logic before chunking
agentJs = agentJs.replace(/    \/\/ Chunk into batches\n    const batches = \[\];/, `    // Permanent production safety ceiling to prevent massive floods
    if (!CONTROLLED_TEST_MODE && mappedEvents.length > 500) {
        console.warn(\`[AGENT] Safety ceiling activated. Limiting \${mappedEvents.length} events to 500.\`);
        mappedEvents.length = 500;
    }

    // Chunk into batches
    const batches = [];`);

fs.writeFileSync('essl-agent/agent.js', agentJs);
