@echo off
REM Test script to verify biometric event ingestion on Windows

setlocal enabledelayedexpansion

REM Configuration
set BACKEND_URL=http://localhost:8765
set BIOMETRIC_SECRET=biometric-secret-key
set EMPLOYEE_CODE=EMP001
set DEVICE_ID=20

REM Get current date and time
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set date=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set time=%%a:%%b)

REM Create JSON payload
set PAYLOAD={
set PAYLOAD=!PAYLOAD!"events": [
set PAYLOAD=!PAYLOAD!  {
set PAYLOAD=!PAYLOAD!    "source_table": "DeviceLogs_7_2026",
set PAYLOAD=!PAYLOAD!    "source_event_id": "test_windows_in",
set PAYLOAD=!PAYLOAD!    "employee_code": "!EMPLOYEE_CODE!",
set PAYLOAD=!PAYLOAD!    "device_id": "!DEVICE_ID!",
set PAYLOAD=!PAYLOAD!    "direction": "in",
set PAYLOAD=!PAYLOAD!    "local_punch_time": "!date! !time!"
set PAYLOAD=!PAYLOAD!  },
set PAYLOAD=!PAYLOAD!  {
set PAYLOAD=!PAYLOAD!    "source_table": "DeviceLogs_7_2026",
set PAYLOAD=!PAYLOAD!    "source_event_id": "test_windows_out",
set PAYLOAD=!PAYLOAD!    "employee_code": "!EMPLOYEE_CODE!",
set PAYLOAD=!PAYLOAD!    "device_id": "!DEVICE_ID!",
set PAYLOAD=!PAYLOAD!    "direction": "out",
set PAYLOAD=!PAYLOAD!    "local_punch_time": "!date! 18:30:00"
set PAYLOAD=!PAYLOAD!  }
set PAYLOAD=!PAYLOAD!]
set PAYLOAD=!PAYLOAD!}

echo Testing biometric event ingestion...
echo Endpoint: !BACKEND_URL!/api/v1/biometric/ingest
echo Employee Code: !EMPLOYEE_CODE!
echo.

REM Send request using curl
curl -X POST "!BACKEND_URL!/api/v1/biometric/ingest" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer !BIOMETRIC_SECRET!" ^
  -d "!PAYLOAD!"

echo.
echo.
echo If you see status 207, events were successfully ingested!
echo If you see status 401, check BIOMETRIC_AGENT_SECRET in .env
echo.
echo To verify events were stored, run:
echo   C:\xampp\php\php.exe artisan tinker
echo   App\Models\BiometricEvent::latest()-^>take(5)-^>get()

pause
