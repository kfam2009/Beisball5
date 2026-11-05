@echo off
setlocal

set "ROOT=C:\Users\claud\Videos\Panel Replay"
set "NODE_EXE=%ROOT%\runtime\node.exe"
set "PORT=3001"
set "VMIX_HOST=127.0.0.1"
set "VMIX_PORT=8088"

cd /d "%ROOT%"
"%NODE_EXE%" server.js >> "%ROOT%\panel-replay-server.log" 2>> "%ROOT%\panel-replay-server.err.log"

endlocal
