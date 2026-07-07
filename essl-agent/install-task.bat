@echo off
cd /d "%~dp0"
echo Installing eSSL Biometric Sync Agent...

set TASK_NAME=eSSL_Biometric_Sync
set SCRIPT_PATH=%~dp0agent.js
set LOG_PATH=%~dp0sync.log

:: Resolve absolute path for node
for /f "delims=" %%I in ('where node') do (
    set NODE_EXE=%%I
    goto :FoundNode
)
:FoundNode

if "%NODE_EXE%"=="" (
    echo [ERROR] Node.js is not found in PATH. Please install Node.js.
    pause
    exit /b 1
)

echo Using Node.js at: %NODE_EXE%

echo Checking for existing task...
schtasks /query /tn "%TASK_NAME%" >nul 2>&1
if %errorlevel% equ 0 (
    echo Deleting existing task...
    schtasks /delete /tn "%TASK_NAME%" /f
)

echo Creating Task Scheduler entry...
schtasks /create /tn "%TASK_NAME%" /tr "cmd.exe /c \"cd /d ^\"%~dp0^\" && ^\"%NODE_EXE%^\" ^\"%SCRIPT_PATH%^\" >> ^\"%LOG_PATH%^\" 2>&1\"" /sc minute /mo 5 /ru "SYSTEM" /f

if %errorlevel% equ 0 (
    echo Successfully installed the sync agent as a background task.
    echo The agent will run every 5 minutes and survive reboots automatically.
    echo Logs will be appended to %LOG_PATH%
) else (
    echo Failed to install the task. Please run this script as Administrator.
)

pause
