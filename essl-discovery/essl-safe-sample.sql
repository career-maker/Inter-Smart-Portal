-- eSSL Safe Sample Discovery Script
-- Strictly Read-Only Sample Data Extraction
-- Do not run on any database other than eTimeTracklite1

SET NOCOUNT ON;

-- 1. VERIFY ACTIVE DATABASE
IF DB_NAME() <> 'eTimeTracklite1'
BEGIN
    PRINT 'CRITICAL SAFETY ABORT: Active database is not eTimeTracklite1. Currently connected to: ' + DB_NAME();
    RETURN;
END

PRINT 'Verified active database is eTimeTracklite1. Proceeding with sample extraction...';
PRINT '==================================================';

-- Query A: Latest 20 rows from dbo.DeviceLogs_7_2026
PRINT 'QUERY A: TOP 20 DeviceLogs_7_2026';
SELECT TOP 20 
    DeviceLogId, 
    DeviceId, 
    UserId, 
    LogDate, 
    Direction, 
    AttDirection 
FROM dbo.DeviceLogs_7_2026
ORDER BY LogDate DESC, DeviceLogId DESC;

PRINT '==================================================';

-- Query B: Employee-code mapping fields
PRINT 'QUERY B: TOP 20 Employees';
SELECT TOP 20 
    EmployeeId, 
    EmployeeCode, 
    EmployeeName 
FROM dbo.Employees;

PRINT '==================================================';

-- Query C: Device identifiers
PRINT 'QUERY C: TOP 20 Devices';
SELECT TOP 20 
    DeviceId, 
    DeviceFName, 
    DeviceSName, 
    SerialNumber, 
    DeviceDirection, 
    DeviceLocation 
FROM dbo.Devices;

PRINT '==================================================';
PRINT 'SAMPLE EXTRACTION COMPLETE. ZERO WRITE OPERATIONS EXECUTED.';
