@echo off
setlocal

cd /d "%~dp0\.."

set "ROOT=%CD%"
set "NODE=C:\Users\claud\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
set "PORT=8135"

if not exist "%NODE%" (
  echo No encuentro Node en:
  echo %NODE%
  echo.
  echo Avisale a Codex para ajustar el arranque.
  pause
  exit /b 1
)

echo Iniciando Baseball5 NDI...
echo Panel:  http://localhost:%PORT%/control.html
echo Render: http://localhost:%PORT%/scorebug.html
echo.

start "Baseball5 NDI Server" /min "%NODE%" "%ROOT%\src\server.js"
timeout /t 2 /nobreak >nul
start "" "http://localhost:%PORT%/control.html"

endlocal
