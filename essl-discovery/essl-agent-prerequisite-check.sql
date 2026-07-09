SET NOCOUNT ON;

IF DB_NAME() <> 'eTimeTracklite1'
BEGIN
    PRINT 'CRITICAL SAFETY ABORT: Active database is not eTimeTracklite1. Currently connected to: ' + DB_NAME();
    RETURN;
END

PRINT 'Verified active database is eTimeTracklite1. Proceeding with read-only prerequisite check...';
PRINT '==================================================';

PRINT '=== TASK 1: UserId SCHEMA ==='
SELECT 
    c.name AS ColumnName,
    t.name AS DataType,
    c.max_length AS MaxLengthBytes,
    c.is_nullable AS IsNullable
FROM sys.columns c
INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID('dbo.DeviceLogs_7_2026')
  AND c.name = 'UserId';

PRINT '==================================================';

PRINT '=== TASK 2: LEADING-ZERO EVIDENCE ==='
SELECT 
    COUNT(UserId) AS TotalNonNullUserId,
    SUM(CASE WHEN UserId LIKE '0%' THEN 1 ELSE 0 END) AS CountLeadingZero,
    MAX(LEN(UserId)) AS MaxLengthObserved,
    MIN(LEN(UserId)) AS MinLengthObserved,
    MAX(CASE WHEN UserId LIKE '0%' AND LEN(UserId) > 1 THEN LEFT(UserId, 1) + '***' + RIGHT(UserId, 1) ELSE NULL END) AS RedactedSample
FROM dbo.DeviceLogs_7_2026;

PRINT '==================================================';

PRINT '=== TASK 3: PERMISSION EVIDENCE ==='
SELECT 
    ORIGINAL_LOGIN() AS CurrentLogin,
    USER_NAME() AS CurrentDatabaseUser,
    IS_ROLEMEMBER('db_datareader') AS IsDbDataReader,
    IS_ROLEMEMBER('db_datawriter') AS IsDbDataWriter,
    IS_ROLEMEMBER('db_owner') AS IsDbOwner,
    HAS_PERMS_BY_NAME('dbo.DeviceLogs_7_2026', 'OBJECT', 'INSERT') AS HasInsert,
    HAS_PERMS_BY_NAME('dbo.DeviceLogs_7_2026', 'OBJECT', 'UPDATE') AS HasUpdate,
    HAS_PERMS_BY_NAME('dbo.DeviceLogs_7_2026', 'OBJECT', 'DELETE') AS HasDelete,
    HAS_PERMS_BY_NAME('dbo.DeviceLogs_7_2026', 'OBJECT', 'ALTER') AS HasAlter,
    HAS_PERMS_BY_NAME('dbo.DeviceLogs_7_2026', 'OBJECT', 'CONTROL') AS HasControl;

PRINT '==================================================';

PRINT '=== TASK 4: TIMESTAMP EXTRACTION EVIDENCE ==='
SELECT TOP 3 
    DeviceLogId, 
    DeviceId, 
    CASE WHEN UserId IS NOT NULL AND LEN(UserId) > 1 THEN LEFT(UserId, 1) + '***' + RIGHT(UserId, 1) ELSE '***' END AS RedactedUserId, 
    CONVERT(varchar(19), LogDate, 120) AS LocalPunchTime, 
    Direction 
FROM dbo.DeviceLogs_7_2026
ORDER BY LogDate DESC, DeviceLogId DESC;

PRINT '==================================================';
PRINT 'PREREQUISITE CHECK COMPLETE. ZERO WRITE OPERATIONS EXECUTED.';
