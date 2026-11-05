@echo off
setlocal

cd /d "%~dp0\.."

set "ROOT=%CD%"
set "B5_NDI_PORT=8135"
set "URL=http://localhost:%B5_NDI_PORT%/control.html"

echo Abriendo panel Baseball5 NDI en navegador normal...
echo Panel: %URL%
echo.

start "" "%URL%"

endlocal
