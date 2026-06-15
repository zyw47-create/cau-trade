[CmdletBinding()]
param(
  [string]$TaskName = 'CampusTradeMySqlDailyBackup',
  [string]$At = '02:00',
  [string]$LoginPath = 'campus_backup',
  [int]$RetentionDays = 30,
  [switch]$Register
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$backupScript = Join-Path $PSScriptRoot 'backup.ps1'
if (-not (Test-Path -LiteralPath $backupScript)) {
  throw "backup.ps1 not found: $backupScript"
}

$time = [DateTime]::ParseExact($At, 'HH:mm', $null)
$argument = "-NoProfile -ExecutionPolicy Bypass -File `"$backupScript`" -LoginPath $LoginPath -RetentionDays $RetentionDays"

if (-not $Register) {
  Write-Output 'Dry run only. To create the task, re-run with -Register.'
  Write-Output "TaskName: $TaskName"
  Write-Output "DailyAt: $At"
  Write-Output "Action: powershell.exe $argument"
  Write-Output 'Before registering, store credentials once with mysql_config_editor:'
  Write-Output "mysql_config_editor set --login-path=$LoginPath --host=127.0.0.1 --user=campus_backup --password"
  exit 0
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argument
$trigger = New-ScheduledTaskTrigger -Daily -At $time
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description 'Daily MySQL backup for campus_trade database' -Force | Out-Null
Write-Output "Registered scheduled task: $TaskName"
