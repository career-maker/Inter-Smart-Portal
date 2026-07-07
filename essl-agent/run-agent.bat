@echo off
cd /d "%~dp0"

set NODE_EXE=node
for /f "delims=" %%I in ('where node') do (
    set NODE_EXE=%%I
    goto :FoundNode
)
:FoundNode

"%NODE_EXE%" "%~dp0agent.js" >> "%~dp0sync.log" 2>&1
