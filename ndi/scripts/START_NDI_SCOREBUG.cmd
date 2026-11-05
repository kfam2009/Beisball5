@echo off
setlocal

cd /d "%~dp0\.."

set "ROOT=%CD%"
set "ELECTRON=%ROOT%\node_modules\electron\dist\electron.exe"
set "B5_NDI_ENABLED=1"
set "B5_NDI_PORT=8135"
set "B5_NDI_FPS=30"
set "PORT="

if not exist "%ELECTRON%" (
  echo No encuentro Electron en:
  echo %ELECTRON%
  echo.
  echo Avisale a Codex para reinstalar Electron.
  pause
  exit /b 1
)

echo Iniciando Baseball5 Scorebug como fuente NDI...
echo Fuente NDI: B5 Scorebug
echo Panel: http://localhost:8135/control.html
echo.

start "Baseball5 NDI Scorebug" /min "%ELECTRON%" .

endlocal
