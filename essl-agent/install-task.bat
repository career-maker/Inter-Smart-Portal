@echo off
cd /d "%~dp0"
echo Installing eSSL Biometric Sync Agent...

set TASK_NAME=eSSL_Biometric_Sync
set WRAPPER_PATH=%~dp0run-agent.bat

echo Checking for existing task...
schtasks /query /tn "%TASK_NAME%" >nul 2>&1
if %errorlevel% equ 0 (
    echo Deleting existing task...
    schtasks /delete /tn "%TASK_NAME%" /f
)

echo Creating Task Scheduler entry...
schtasks /create /tn "%TASK_NAME%" /tr "\"%WRAPPER_PATH%\"" /sc minute /mo 5 /ru "SYSTEM" /f

if %errorlevel% equ 0 (
    echo Successfully installed the sync agent as a background task.
    echo The agent will run every 5 minutes and survive reboots automatically.
    echo Logs will be appended to %~dp0sync.log
) else (
    echo Failed to install the task. Please run this script as Administrator.
)

pause
