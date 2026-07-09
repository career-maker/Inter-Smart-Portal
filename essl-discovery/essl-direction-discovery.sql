-- eSSL Direction Discovery Script
-- Strictly Read-Only Extraction for Mapping Analysis
-- Do not run on any database other than eTimeTracklite1

SET NOCOUNT ON;

-- 1. VERIFY ACTIVE DATABASE
IF DB_NAME() <> 'eTimeTracklite1'
BEGIN
    PRINT 'CRITICAL SAFETY ABORT: Active database is not eTimeTracklite1. Currently connected to: ' + DB_NAME();
    RETURN;
END

PRINT 'Verified active database is eTimeTracklite1. Proceeding with read-only extraction...';
PRINT '==================================================';

-- Query: Retrieve latest 30 direction samples across devices
SELECT TOP 30 
    l.DeviceLogId,
    l.DeviceId,
    l.LogDate,
    l.Direction,
    l.AttDirection,
    d.DeviceFName,
    d.DeviceSName,
    d.DeviceDirection,
    d.DeviceLocation
FROM dbo.DeviceLogs_7_2026 l
LEFT JOIN dbo.Devices d ON l.DeviceId = d.DeviceId
ORDER BY l.LogDate DESC, l.DeviceLogId DESC;

PRINT '==================================================';
PRINT 'SAMPLE EXTRACTION COMPLETE. ZERO WRITE OPERATIONS EXECUTED.';
