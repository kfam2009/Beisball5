@echo off
setlocal

cd /d "%~dp0\.."

set "ROOT=%CD%"
set "ELECTRON=%ROOT%\node_modules\electron\dist\electron.exe"

if not exist "%ELECTRON%" (
  echo No encuentro Electron local en:
  echo %ELECTRON%
  echo.
  echo Ejecuta primero:
  echo npm install
  pause
  exit /b 1
)

echo Iniciando preview offscreen de Baseball5 NDI...
echo Panel: http://localhost:8135/control.html
echo.

start "Baseball5 NDI Preview" /min "%ELECTRON%" .
timeout /t 2 /nobreak >nul
start "" "http://localhost:8135/control.html"

endlocal
