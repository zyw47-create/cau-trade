$ErrorActionPreference = 'Stop'

$BackendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Node = 'D:\nodejs\node.exe'
if (-not (Test-Path -LiteralPath $Node)) {
  $Node = 'node'
}

$OutLog = Join-Path $BackendDir 'backend.out.log'
$ErrLog = Join-Path $BackendDir 'backend.err.log'
$PidFile = Join-Path $BackendDir 'backend.pid'

if (Test-Path -LiteralPath $OutLog) { Clear-Content -LiteralPath $OutLog }
if (Test-Path -LiteralPath $ErrLog) { Clear-Content -LiteralPath $ErrLog }

$Process = Start-Process -FilePath $Node -ArgumentList 'server.js' -WorkingDirectory $BackendDir -WindowStyle Hidden -PassThru
$Process.Id | Set-Content -LiteralPath $PidFile
Start-Sleep -Seconds 1

try {
  $Status = Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3001/api/status -TimeoutSec 3
  $Status.Content
} catch {
  Write-Output '后端启动失败，错误日志：'
  if (Test-Path -LiteralPath $ErrLog) {
    Get-Content -LiteralPath $ErrLog
  }
  throw
}
