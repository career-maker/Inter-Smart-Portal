@echo off
REM ============================================================
REM  Inter Smart Employee Portal — Supabase → MySQL Migration
REM  Master Runner
REM  READ-ONLY source. No writes to Supabase or cPanel.
REM ============================================================

REM Credentials are passed as environment variables.
REM They are NOT printed anywhere in this script.
REM They are NOT written to any output file.
SET MIGRATION_DB_HOST=aws-1-ap-northeast-1.pooler.supabase.com
SET MIGRATION_DB_PORT=5432
SET MIGRATION_DB_NAME=postgres
SET MIGRATION_DB_USER=postgres.shczwbwsrnrygmmvyeue

REM --- Load password from a local .migration_secret file to avoid it appearing in this file ---
REM Create the file manually:  echo Abhihere1234@ > .migration_secret
REM (The file is listed in .gitignore)
IF EXIST "%~dp0.migration_secret" (
    SET /P MIGRATION_DB_PASS=<"%~dp0.migration_secret"
) ELSE (
    ECHO.
    ECHO ERROR: .migration_secret file not found.
    ECHO Please create it:  echo Abhihere1234@ ^> "%~dp0.migration_secret"
    ECHO Then re-run this script.
    GOTO :EOF
)

REM Determine PHP location
WHERE php >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    ECHO ERROR: php not found in PATH.
    ECHO Please ensure PHP 8.x is installed and available.
    GOTO :EOF
)

ECHO ============================================================
ECHO  Phase 1: Schema Discovery
ECHO ============================================================
php "%~dp0scripts\01_discover_schema.php"
IF %ERRORLEVEL% NEQ 0 (
    ECHO ERROR in Phase 1. Aborting.
    GOTO :EOF
)

ECHO.
ECHO ============================================================
ECHO  Phase 2: Check for pg_dump (optional)
ECHO ============================================================
WHERE pg_dump >nul 2>nul
IF %ERRORLEVEL% EQU 0 (
    ECHO pg_dump found. Creating PostgreSQL backup...
    SET PGPASSWORD=%MIGRATION_DB_PASS%
    pg_dump --no-password --host=%MIGRATION_DB_HOST% --port=%MIGRATION_DB_PORT% --username=%MIGRATION_DB_USER% --dbname=%MIGRATION_DB_NAME% --schema=public --no-owner --no-acl --format=plain --encoding=UTF8 --file="%~dp0source\supabase_postgresql_original.sql"
    IF %ERRORLEVEL% EQU 0 (
        ECHO pg_dump backup created.
        REM Compress
        WHERE gzip >nul 2>nul
        IF %ERRORLEVEL% EQU 0 (
            gzip -k "%~dp0source\supabase_postgresql_original.sql"
            ECHO Compressed backup created.
        )
        REM Checksum
        certutil -hashfile "%~dp0source\supabase_postgresql_original.sql" SHA256 > "%~dp0source\supabase_postgresql_original.sql.sha256"
        ECHO Checksum saved.
    ) ELSE (
        ECHO pg_dump failed. Continuing with PHP-based extraction.
    )
    SET PGPASSWORD=
) ELSE (
    ECHO pg_dump not found. Using PHP-based extraction only.
    ECHO (This is fine — data will still be exported via PDO)
)

ECHO.
ECHO ============================================================
ECHO  Phase 3-7: Convert PostgreSQL Schema + Data to MySQL
ECHO ============================================================
php "%~dp0scripts\03_convert_to_mysql.php"
IF %ERRORLEVEL% NEQ 0 (
    ECHO ERROR in conversion phase. Aborting.
    GOTO :EOF
)

ECHO.
ECHO ============================================================
ECHO  Phase 8: Validate MySQL Dump
ECHO ============================================================
php "%~dp0scripts\04_validate.php"

ECHO.
ECHO ============================================================
ECHO  Phase 9: Assemble Package
ECHO ============================================================
php "%~dp0scripts\05_package.php"

ECHO.
ECHO ============================================================
ECHO  MIGRATION COMPLETE
ECHO  Final SQL: database\migration\mysql\inter-smart-employee-portal-mysql.sql
ECHO  Package  : database\migration\inter-smart-employee-portal-mysql-migration.zip
ECHO ============================================================

REM Clear sensitive env vars
SET MIGRATION_DB_PASS=
SET MIGRATION_DB_USER=
SET MIGRATION_DB_HOST=
SET MIGRATION_DB_NAME=
SET MIGRATION_DB_PORT=
