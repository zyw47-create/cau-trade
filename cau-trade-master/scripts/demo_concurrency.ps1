param(
  [string]$BaseUrl = "http://127.0.0.1:5000",
  [ValidateSet("goods", "service", "errand")]
  [string]$Type = "errand",
  [int]$Id = 206,
  [int]$UserA = 6,
  [int]$UserB = 8
)

$ErrorActionPreference = "Stop"

function Login-User([int]$UserId) {
  $body = @{ userId = $UserId } | ConvertTo-Json -Compress
  $res = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/auth/login" -ContentType "application/json" -Body $body
  return $res.data.token
}

function Invoke-TradeAction([string]$Token, [string]$Name, [string]$BaseUrlArg, [string]$TypeArg, [int]$IdArg) {
  $headers = @{ Authorization = "Bearer $Token" }
  if ($TypeArg -eq "goods") {
    $uri = "$BaseUrlArg/api/order/create"
    $body = @{ goodsId = $IdArg } | ConvertTo-Json -Compress
  } elseif ($TypeArg -eq "service") {
    $uri = "$BaseUrlArg/api/service/order"
    $body = @{ id = $IdArg } | ConvertTo-Json -Compress
  } else {
    $uri = "$BaseUrlArg/api/rider/take"
    $body = @{ id = $IdArg } | ConvertTo-Json -Compress
  }

  try {
    $res = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -ContentType "application/json" -Body $body
    [pscustomobject]@{
      Client = $Name
      Code = $res.code
      Message = $res.msg
      Data = ($res.data | ConvertTo-Json -Compress)
    }
  } catch {
    [pscustomobject]@{
      Client = $Name
      Code = "HTTP_ERROR"
      Message = $_.Exception.Message
      Data = ""
    }
  }
}

$tokenA = Login-User $UserA
$tokenB = Login-User $UserB

$jobA = Start-Job -ScriptBlock ${function:Invoke-TradeAction} -ArgumentList $tokenA, "A", $BaseUrl, $Type, $Id
$jobB = Start-Job -ScriptBlock ${function:Invoke-TradeAction} -ArgumentList $tokenB, "B", $BaseUrl, $Type, $Id

Wait-Job $jobA, $jobB | Out-Null
Receive-Job $jobA, $jobB | Format-Table -AutoSize
Remove-Job $jobA, $jobB
