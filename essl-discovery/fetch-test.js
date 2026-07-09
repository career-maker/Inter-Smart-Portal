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
    }
};

async function main() {
    try {
        await sql.connect(config);
        
        // Find events for our portal users
        const result = await sql.query(`
            SELECT TOP 20 
                DeviceLogId, UserId, Direction, LogDate 
            FROM DeviceLogs_6_2026 
            WHERE UserId IN ('231', '272', '013', '005', 'J06', 'EMP-001')
            ORDER BY UserId, LogDate ASC
        `);
        
        console.log(JSON.stringify(result.recordset, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}

main();
