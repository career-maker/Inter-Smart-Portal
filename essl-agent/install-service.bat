@echo off
echo Installing eSSL Biometric Sync Agent...

set TASK_NAME=eSSL_Biometric_Sync
set SCRIPT_PATH=%~dp0agent.js
set NODE_EXE=node
set LOG_PATH=%~dp0sync.log

echo Checking for existing task...
schtasks /query /tn "%TASK_NAME%" >nul 2>&1
if %errorlevel% equ 0 (
    echo Deleting existing task...
    schtasks /delete /tn "%TASK_NAME%" /f
)

echo Creating Task Scheduler entry...
:: Runs every 5 minutes, under the SYSTEM account (so it runs whether logged in or not)
:: Redirects standard output and standard error to sync.log
schtasks /create /tn "%TASK_NAME%" /tr "cmd.exe /c \"%NODE_EXE% ^\"%SCRIPT_PATH%^\" >> ^\"%LOG_PATH%^\" 2>&1\"" /sc minute /mo 5 /ru "SYSTEM" /f

if %errorlevel% equ 0 (
    echo Successfully installed the sync agent as a background task.
    echo The agent will run every 5 minutes and survive reboots automatically.
    echo Logs will be appended to %LOG_PATH%
) else (
    echo Failed to install the task. Please run this script as Administrator.
)

pause
