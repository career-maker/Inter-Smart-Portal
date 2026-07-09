
const sql = require('mssql');
const config = {
    user: 'essl', password: 'essl', server: '127.0.0.1', database: 'eTimeTracklite1',
    options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 3000
};
sql.connect(config).then(pool => {
    return pool.request().query('SELECT c.COLUMN_NAME, c.DATA_TYPE, c.CHARACTER_MAXIMUM_LENGTH, c.IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS c WHERE c.TABLE_NAME = \'DeviceLogs_7_2026\' AND c.COLUMN_NAME = \'UserId\'').then(res => {
        console.table(res.recordset);
        return pool.request().query('SELECT TOP 1 UserId FROM dbo.DeviceLogs_7_2026 WHERE UserId LIKE \'0%\'');
    }).then(res => {
        console.log('Sample UserId:', res.recordset.length ? res.recordset[0].UserId : 'None found');
        return pool.request().query('SELECT SUSER_NAME(), IS_SRVROLEMEMBER(\'sysadmin\'), HAS_PERMS_BY_NAME(null, null, \'UPDATE\')');
    }).then(res => {
        console.log(res.recordset[0]);
        process.exit(0);
    });
}).catch(err => {
    console.error(err.message);
    process.exit(1);
});

