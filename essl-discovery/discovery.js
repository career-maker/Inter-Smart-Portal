require('dotenv').config();
const sql = require('mssql');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: false, 
        trustServerCertificate: true
    },
    pool: {
        max: 5,
        min: 0,
        idleTimeoutMillis: 5000 // Short pool timeout
    },
    requestTimeout: 5000,       // 5 seconds hard request timeout
    connectionTimeout: 5000     // 5 seconds hard connection timeout
};

/**
 * Validates a SQL string to strictly ensure it only contains approved SELECT statements.
 * Hard regex guard provides defense-in-depth against data mutation or administrative commands.
 * NOTE: This is defense-in-depth and NOT a substitute for a read-only SQL account.
 */
function enforceReadOnly(queryString) {
    // Block semicolons and comments entirely
    if (queryString.includes(';') || queryString.includes('--') || queryString.includes('/*') || queryString.includes('*/')) {
        throw new Error(`SECURITY EXCEPTION: Query blocked. Semicolons and comments are not allowed.`);
    }

    // Defense-in-depth blacklist for dangerous operations
    const forbiddenPatterns = /\b(insert|update|delete|merge|alter|create|drop|truncate|exec|execute|into|dbcc|grant|revoke|deny|backup|restore|bulk|openrowset|opendatasource|openquery|shutdown|kill|reconfigure|use)\b/i;
    
    if (forbiddenPatterns.test(queryString)) {
        throw new Error(`SECURITY EXCEPTION: Query blocked. Administrative or write operations are forbidden.`);
    }

    // Strict allowlist-first approach: Must start with SELECT
    if (!/^\s*SELECT\b/i.test(queryString)) {
        throw new Error(`SECURITY EXCEPTION: Query blocked. Only SELECT statements are permitted.`);
    }

    // Ban "SELECT *" globally, including qualified wildcards (e.g. table.*, [table].*)
    if (/\bSELECT\s+(?:[\w\.\[\]]+\.)?\*/i.test(queryString)) {
        throw new Error(`SECURITY EXCEPTION: Query blocked. SELECT * is forbidden.`);
    }
}

async function executeReadOnlyQuery(pool, query, description) {
    try {
        enforceReadOnly(query);
        console.log(`\n=== ${description} ===`);
        const result = await pool.request().query(query);
        console.table(result.recordset);
    } catch (err) {
        console.error(`Error executing "${description}":`, err.message);
    }
}

async function runDiscovery() {
    console.log("Connecting to eSSL Database...");
    let pool;
    try {
        pool = await sql.connect(config);
        console.log("Connection successful!");

        // 1. VERIFY ACTIVE DATABASE
        // Ensure we are strictly connected to the requested eTimeTracklite1 DB.
        const dbCheckQuery = "SELECT DB_NAME() AS CurrentDB";
        enforceReadOnly(dbCheckQuery);
        const dbCheckResult = await pool.request().query(dbCheckQuery);
        const activeDb = dbCheckResult.recordset[0].CurrentDB;
        
        if (activeDb !== 'eTimeTracklite1') {
            console.error(`CRITICAL SAFETY ABORT: Connected to database '${activeDb}', but expected 'eTimeTracklite1'.`);
            return;
        }
        console.log("Verified active database is eTimeTracklite1. Proceeding with schema discovery...");

        // 2. SCHEMA DISCOVERY: Tables and Views
        const tableQuery = `
            SELECT TABLE_CATALOG, TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE (TABLE_NAME LIKE '%Log%' OR TABLE_NAME LIKE '%Punch%' OR TABLE_NAME LIKE '%Transaction%' OR TABLE_NAME LIKE '%Device%' OR TABLE_NAME LIKE '%Emp%' OR TABLE_NAME LIKE '%User%' OR TABLE_NAME LIKE '%Attend%')
            ORDER BY TABLE_NAME ASC
        `;
        await executeReadOnlyQuery(pool, tableQuery, "STAGE A: Discovering Target Tables and Views");

        // 3. SCHEMA DISCOVERY: Columns
        const columnQuery = `
            SELECT 
                c.TABLE_NAME, 
                c.COLUMN_NAME, 
                c.DATA_TYPE, 
                c.IS_NULLABLE,
                c.CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS c
            INNER JOIN INFORMATION_SCHEMA.TABLES t ON c.TABLE_NAME = t.TABLE_NAME
            WHERE (t.TABLE_NAME LIKE '%Log%' OR t.TABLE_NAME LIKE '%Punch%' OR t.TABLE_NAME LIKE '%Transaction%' OR t.TABLE_NAME LIKE '%Device%' OR t.TABLE_NAME LIKE '%Emp%' OR t.TABLE_NAME LIKE '%User%' OR t.TABLE_NAME LIKE '%Attend%')
            ORDER BY c.TABLE_NAME ASC, c.ORDINAL_POSITION ASC
        `;
        await executeReadOnlyQuery(pool, columnQuery, "STAGE A: Discovering Columns and Data Types");

        // 4. SCHEMA DISCOVERY: Constraints (PKs and Identities)
        const constraintsQuery = `
            SELECT 
                t.name AS TableName,
                c.name AS ColumnName,
                c.is_identity AS IsIdentity,
                i.name AS IndexName,
                i.is_primary_key AS IsPrimaryKey
            FROM sys.tables t
            INNER JOIN sys.indexes i ON t.object_id = i.object_id
            INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
            INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
            WHERE (t.name LIKE '%Log%' OR t.name LIKE '%Punch%' OR t.name LIKE '%Transaction%' OR t.name LIKE '%Device%' OR t.name LIKE '%Emp%' OR t.name LIKE '%User%' OR t.name LIKE '%Attend%')
            ORDER BY t.name, c.name
        `;
        await executeReadOnlyQuery(pool, constraintsQuery, "STAGE A: Discovering Primary Keys and Identity Columns");

        console.log("\nSTAGE A DISCOVERY COMPLETE. NO PRODUCTION ROWS WERE READ.");

    } catch (err) {
        console.error("Database connection failed:", err.message);
    } finally {
        if (pool) {
            console.log("\nClosing connection safely...");
            await pool.close();
            console.log("Connection closed.");
        }
    }
}

runDiscovery();
