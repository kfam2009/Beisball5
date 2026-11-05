$ErrorActionPreference = "Stop"

$root = "C:\Users\claud\Videos\Panel Replay"
$node = Join-Path $root "runtime\node.exe"
$outLog = Join-Path $root "panel-replay-server.log"
$errLog = Join-Path $root "panel-replay-server.err.log"

$panelProcesses = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { $_.CommandLine -like "*C:\Users\claud\Videos\Panel Replay\runtime\node.exe*server.js*" }

foreach ($process in $panelProcesses) {
  Stop-Process -Id $process.ProcessId -Force
}

$panelShells = Get-CimInstance Win32_Process -Filter "Name = 'cmd.exe'" |
  Where-Object {
    $_.CommandLine -like "*C:\Users\claud\Videos\Panel Replay\Abrir Panel Replay.bat*" -or
    $_.CommandLine -like "*run-panel-replay-server.cmd*" -or
    $_.CommandLine -like "*START_CONTROL_KIOSK.cmd*"
  }

foreach ($process in $panelShells) {
  Stop-Process -Id $process.ProcessId -Force
}

Start-Sleep -Milliseconds 700

$env:VMIX_HOST = "127.0.0.1"
$env:VMIX_PORT = "8088"
$env:PORT = "3001"

Start-Process `
  -FilePath $node `
  -ArgumentList "server.js" `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -RedirectStandardOutput $outLog `
  -RedirectStandardError $errLog

Start-Sleep -Seconds 2

$homeResponse = Invoke-WebRequest -Uri "http://localhost:3001/" -TimeoutSec 3 -UseBasicParsing
$endpoint = Invoke-RestMethod -Method Post -Uri "http://localhost:3001/baseball5-ndi/open" -TimeoutSec 8

[pscustomobject]@{
  server = $homeResponse.StatusCode
  endpointOk = $endpoint.ok
  endpointMode = $endpoint.mode
  panelUrl = $endpoint.panelUrl
}
