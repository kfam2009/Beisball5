$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$statePath = Join-Path $root "data\state.json"
$node = "C:\Users\claud\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$electron = Join-Path $root "node_modules\electron\dist\electron.exe"

$raw = [System.IO.File]::ReadAllText($statePath).TrimStart([char]0xFEFF)
[System.IO.File]::WriteAllText($statePath, $raw, (New-Object System.Text.UTF8Encoding($false)))

& $node --check (Join-Path $root "src\server.js")
& $node --check (Join-Path $root "src\electron-main.js")
& $node --check (Join-Path $root "public\assets\graphics.js")

$processes = Get-CimInstance Win32_Process -Filter "Name = 'electron.exe'" |
  Where-Object { $_.CommandLine -like "*baseball5-ndi*" }

foreach ($process in $processes) {
  Stop-Process -Id $process.ProcessId -Force
}

Start-Sleep -Seconds 1

$env:B5_NDI_ENABLED = "1"
$env:B5_NDI_PORT = "8135"
$env:B5_NDI_FPS = "30"

Start-Process -FilePath $electron -ArgumentList "." -WorkingDirectory $root -WindowStyle Hidden
Start-Sleep -Seconds 3
Start-Process -FilePath $electron -ArgumentList (Join-Path $root "src\panel-main.js") -WorkingDirectory $root
Start-Sleep -Seconds 2

Invoke-RestMethod -Uri "http://localhost:8135/api/state" -TimeoutSec 3 |
  Select-Object -ExpandProperty ndi |
  ConvertTo-Json -Depth 4
