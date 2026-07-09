USE master;
GO

IF DB_ID('eTimeTracklite1') IS NULL
BEGIN
    PRINT 'CRITICAL ABORT: eTimeTracklite1 database does not exist on this server.';
    SET NOEXEC ON;
END
GO

USE eTimeTracklite1;
GO

PRINT 'Creating dedicated login essl_sync_agent...';
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'essl_sync_agent')
BEGIN
    CREATE LOGIN [essl_sync_agent] WITH PASSWORD = '[GENERATE_STRONG_PASSWORD_LOCALLY]', DEFAULT_DATABASE = [eTimeTracklite1];
    PRINT 'Login essl_sync_agent created.';
END
ELSE
BEGIN
    PRINT 'Login essl_sync_agent already exists. Skipping login creation.';
END
GO

PRINT 'Creating database user essl_sync_agent...';
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'essl_sync_agent')
BEGIN
    CREATE USER [essl_sync_agent] FOR LOGIN [essl_sync_agent];
    PRINT 'Database user essl_sync_agent created.';
END
ELSE
BEGIN
    PRINT 'Database user essl_sync_agent already exists. Skipping user creation.';
END
GO

PRINT 'Granting read-only permissions...';
-- We grant db_datareader because eSSL dynamically creates new DeviceLogs_M_YYYY tables monthly.
-- SQL Server does not support wildcard table permissions (e.g. GRANT SELECT ON DeviceLogs_*).
-- db_datareader guarantees read-only access to current and future tables without DDL triggers.
EXEC sp_addrolemember 'db_datareader', 'essl_sync_agent';

-- Explicitly DENY any write/alter permissions as a defense-in-depth measure
DENY INSERT TO [essl_sync_agent];
DENY UPDATE TO [essl_sync_agent];
DENY DELETE TO [essl_sync_agent];
DENY ALTER TO [essl_sync_agent];

PRINT 'Provisioning complete. No write privileges were granted.';
GO
