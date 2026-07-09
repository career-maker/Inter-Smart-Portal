-- eSSL Schema Discovery Script
-- Strictly Read-Only Metadata Extraction
-- Do not run on any database other than eTimeTracklite1

SET NOCOUNT ON;

-- 1. VERIFY ACTIVE DATABASE
IF DB_NAME() <> 'eTimeTracklite1'
BEGIN
    PRINT 'CRITICAL SAFETY ABORT: Active database is not eTimeTracklite1. Currently connected to: ' + DB_NAME();
    RETURN;
END

PRINT 'Verified active database is eTimeTracklite1. Proceeding with schema discovery...';
PRINT '==================================================';

-- 2. SCHEMA DISCOVERY: Tables and Views
PRINT 'STAGE A: Discovering Target Tables and Views';
SELECT 
    TABLE_CATALOG, 
    TABLE_SCHEMA, 
    TABLE_NAME, 
    TABLE_TYPE 
FROM INFORMATION_SCHEMA.TABLES 
WHERE (TABLE_NAME LIKE '%Log%' OR TABLE_NAME LIKE '%Punch%' OR TABLE_NAME LIKE '%Transaction%' OR TABLE_NAME LIKE '%Device%' OR TABLE_NAME LIKE '%Emp%' OR TABLE_NAME LIKE '%User%' OR TABLE_NAME LIKE '%Attend%')
ORDER BY TABLE_NAME ASC;

PRINT '==================================================';

-- 3. SCHEMA DISCOVERY: Columns
PRINT 'STAGE A: Discovering Columns and Data Types';
SELECT 
    c.TABLE_NAME, 
    c.COLUMN_NAME, 
    c.DATA_TYPE, 
    c.IS_NULLABLE,
    c.CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS c
INNER JOIN INFORMATION_SCHEMA.TABLES t ON c.TABLE_NAME = t.TABLE_NAME
WHERE (t.TABLE_NAME LIKE '%Log%' OR t.TABLE_NAME LIKE '%Punch%' OR t.TABLE_NAME LIKE '%Transaction%' OR t.TABLE_NAME LIKE '%Device%' OR t.TABLE_NAME LIKE '%Emp%' OR t.TABLE_NAME LIKE '%User%' OR t.TABLE_NAME LIKE '%Attend%')
ORDER BY c.TABLE_NAME ASC, c.ORDINAL_POSITION ASC;

PRINT '==================================================';

-- 4. SCHEMA DISCOVERY: Constraints (PKs and Identities)
PRINT 'STAGE A: Discovering Primary Keys and Identity Columns';
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
ORDER BY t.name ASC, c.name ASC;

PRINT '==================================================';
PRINT 'STAGE A DISCOVERY COMPLETE. NO PRODUCTION ROWS WERE READ.';
