@echo off
setlocal

set "ROOT=%~dp0"
set "PORT=8126"
set "NODE="

rem 1) Node instalado en el sistema (PATH)
where node >nul 2>nul && set "NODE=node"

rem 2) Respaldo: Node del runtime de Codex
if not defined NODE (
  if exist "C:\Users\claud\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
    set "NODE=C:\Users\claud\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  )
)

cd /d "%ROOT%"

if not defined NODE (
  echo No encuentro Node.js en esta PC.
  echo Instalalo desde https://nodejs.org y volve a abrir este archivo.
  pause
  exit /b 1
)

echo Iniciando Panel GO Baseball5...
echo Panel: http://localhost:%PORT%/control.html
echo.

start "Panel GO Baseball5 Server" /min "%NODE%" server.js
timeout /t 2 /nobreak >nul
start "" "http://localhost:%PORT%/control.html"

endlocal
