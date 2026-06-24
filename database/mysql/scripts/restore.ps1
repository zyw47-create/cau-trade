[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,
  [string]$HostName = '127.0.0.1',
  [int]$Port = 3306,
  [string]$User = 'root',
  [string]$LoginPath = '',
  [string]$MySqlPath = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe',
  [switch]$ConfirmRestore
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-PlainPasswordFromPrompt {
  $secure = Read-Host -AsSecureString 'MySQL password'
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

if (-not $ConfirmRestore) {
  throw 'Restore overwrites database objects. Re-run with -ConfirmRestore after selecting the correct backup file.'
}
if (-not (Test-Path -LiteralPath $MySqlPath)) {
  throw "mysql client not found: $MySqlPath"
}

$resolvedBackup = Resolve-Path -LiteralPath $BackupFile
if ([IO.Path]::GetExtension($resolvedBackup.Path) -ne '.sql') {
  throw 'Only plain .sql backup files are supported by this restore script.'
}

$createdPassword = $false
if ([string]::IsNullOrWhiteSpace($LoginPath) -and [string]::IsNullOrWhiteSpace($env:MYSQL_PWD)) {
  $env:MYSQL_PWD = Get-PlainPasswordFromPrompt
  $createdPassword = $true
}

try {
  $args = @()
  if (-not [string]::IsNullOrWhiteSpace($LoginPath)) {
    $args += "--login-path=$LoginPath"
  }
  else {
    $args += @("--host=$HostName", "--port=$Port", "--user=$User", '--protocol=TCP')
  }
  $args += @('--default-character-set=utf8mb4', '--binary-mode=1')

  $startInfo = [Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $MySqlPath
  foreach ($arg in $args) {
    [void]$startInfo.ArgumentList.Add($arg)
  }
  $startInfo.UseShellExecute = $false
  $startInfo.RedirectStandardInput = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true

  $process = [Diagnostics.Process]::new()
  $process.StartInfo = $startInfo
  [void]$process.Start()

  $reader = [IO.StreamReader]::new($resolvedBackup.Path, [Text.Encoding]::UTF8)
  try {
    while (($line = $reader.ReadLine()) -ne $null) {
      $process.StandardInput.WriteLine($line)
    }
  }
  finally {
    $reader.Close()
    $process.StandardInput.Close()
  }

  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()

  if ($process.ExitCode -ne 0) {
    throw "mysql restore failed with exit code $($process.ExitCode): $stderr"
  }

  if (-not [string]::IsNullOrWhiteSpace($stdout)) {
    Write-Output $stdout
  }
  Write-Output "Restore completed from $($resolvedBackup.Path)"
}
finally {
  if ($createdPassword) {
    Remove-Item Env:\MYSQL_PWD -ErrorAction SilentlyContinue
  }
}
