SET NOCOUNT ON;

IF DB_NAME() <> 'eTimeTracklite1'
BEGIN
    PRINT 'CRITICAL ABORT: Connected to ' + DB_NAME() + ' instead of eTimeTracklite1.';
    RETURN;
END

PRINT '=== IDENTITY VERIFICATION ==='
SELECT 
    ORIGINAL_LOGIN() AS CurrentLogin,
    USER_NAME() AS CurrentDatabaseUser;

PRINT '=== ROLE VERIFICATION ==='
SELECT 
    IS_ROLEMEMBER('db_owner') AS IsDbOwner,
    IS_ROLEMEMBER('db_datawriter') AS IsDbDataWriter,
    IS_ROLEMEMBER('db_datareader') AS IsDbDataReader;

PRINT '=== WRITE PERMISSION VERIFICATION ==='
-- Ensure these report 0 (no effective permission)
SELECT 
    HAS_PERMS_BY_NAME(null, null, 'CONTROL SERVER') AS HasServerControl,
    HAS_PERMS_BY_NAME(null, 'DATABASE', 'CONTROL') AS HasDatabaseControl,
    HAS_PERMS_BY_NAME('dbo.DeviceLogs_7_2026', 'OBJECT', 'INSERT') AS HasInsert,
    HAS_PERMS_BY_NAME('dbo.DeviceLogs_7_2026', 'OBJECT', 'UPDATE') AS HasUpdate,
    HAS_PERMS_BY_NAME('dbo.DeviceLogs_7_2026', 'OBJECT', 'DELETE') AS HasDelete,
    HAS_PERMS_BY_NAME('dbo.DeviceLogs_7_2026', 'OBJECT', 'ALTER') AS HasAlter;

PRINT '=== READ CAPABILITY TEST ==='
SELECT TOP 1 
    DeviceLogId, 
    UserId, 
    CONVERT(varchar(19), LogDate, 120) AS LocalPunchTime 
FROM dbo.DeviceLogs_7_2026;

PRINT 'VERIFICATION COMPLETE. SCRIPT IS READ-ONLY.';
