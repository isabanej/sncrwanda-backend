$ErrorActionPreference = 'Stop'

function Get-Token {
  param([string]$User='trialuser2',[string]$Pass='Secret123!')
  $loginBody = @{ usernameOrEmail = $User; password = $Pass } | ConvertTo-Json
  try {
    $login = Invoke-RestMethod -Uri 'http://localhost:9090/auth/login' -Method Post -Body $loginBody -ContentType 'application/json'
    return $login.token
  } catch {
    # Try register via gateway then login
    try {
      $regBody = Get-Content -Raw 'c:\dev\sncrwanda-backend\temp_register.json'
      Invoke-RestMethod -Uri 'http://localhost:9090/auth/register' -Method Post -Body $regBody -ContentType 'application/json' | Out-Null
    } catch {}
    $login = Invoke-RestMethod -Uri 'http://localhost:9090/auth/login' -Method Post -Body $loginBody -ContentType 'application/json'
    return $login.token
  }
}

try {
  $token = Get-Token
  if (-not $token) { throw 'No token' }
  Write-Output ("TOKEN_OK:{0}" -f $token.Length)

  $me = Invoke-RestMethod -Uri 'http://localhost:9090/auth/me' -Method Get -Headers @{ Authorization = ("Bearer " + $token) }
  Write-Output ("ME:{0}" -f $me.username)

  $summary = Invoke-RestMethod -Uri 'http://localhost:9090/reports/summary' -Method Get -Headers @{ Authorization = ("Bearer " + $token) }
  if ($summary) { Write-Output 'REPORTING_OK' } else { Write-Output 'REPORTING_EMPTY' }

  try { $tx = Invoke-RestMethod -Uri 'http://localhost:9090/transactions' -Method Get -Headers @{ Authorization = ("Bearer " + $token) }; Write-Output ("TX_COUNT:{0}" -f (($tx | Measure-Object).Count)) } catch { Write-Output ('TX_FAIL:' + $_.Exception.Message) }
  try { $emps = Invoke-RestMethod -Uri 'http://localhost:9090/hr/employees' -Method Get -Headers @{ Authorization = ("Bearer " + $token) }; Write-Output ("EMP_COUNT:{0}" -f (($emps | Measure-Object).Count)) } catch { Write-Output ('HR_FAIL:' + $_.Exception.Message) }
} catch {
  Write-Output ("ERROR:{0}" -f $_.Exception.Message)
  exit 1
}
