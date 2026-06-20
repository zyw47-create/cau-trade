$ErrorActionPreference = 'Stop'

$BackendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$NodeCandidates = @(
  'D:\Soft\Node\node.exe',
  'D:\nodejs\node.exe',
  'node'
)
$Node = $NodeCandidates | Where-Object {
  $_ -eq 'node' -or (Test-Path -LiteralPath $_)
} | Select-Object -First 1
if (-not $Node) {
  throw 'Node.js was not found. Please install Node or update start-backend.ps1.'
}

$OutLog = Join-Path $BackendDir 'backend.out.log'
$ErrLog = Join-Path $BackendDir 'backend.err.log'
$PidFile = Join-Path $BackendDir 'backend.pid'

if (netstat -ano | Select-String -Pattern '[:.]3001\s+.*LISTENING' -Quiet) {
  Write-Output 'Backend is already running at http://127.0.0.1:3001.'
  (Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3001/api/status -TimeoutSec 3).Content
  return
}

if (Test-Path -LiteralPath $OutLog) { Clear-Content -LiteralPath $OutLog }
if (Test-Path -LiteralPath $ErrLog) { Clear-Content -LiteralPath $ErrLog }

$ProcessInfo = New-Object System.Diagnostics.ProcessStartInfo
$ProcessInfo.FileName = $Node
$ProcessInfo.Arguments = 'server.js'
$ProcessInfo.WorkingDirectory = $BackendDir
$ProcessInfo.UseShellExecute = $false
$ProcessInfo.CreateNoWindow = $true
$ProcessInfo.RedirectStandardOutput = $false
$ProcessInfo.RedirectStandardError = $false
$Process = [System.Diagnostics.Process]::Start($ProcessInfo)
$Process.Id | Set-Content -LiteralPath $PidFile
Start-Sleep -Seconds 1

try {
  $Status = Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3001/api/status -TimeoutSec 3
  $Status.Content
} catch {
  Write-Output 'Backend failed to start. Error log:'
  if (Test-Path -LiteralPath $ErrLog) {
    Get-Content -LiteralPath $ErrLog
  }
  throw
}
