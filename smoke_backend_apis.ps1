$ErrorActionPreference = 'Stop'

function Write-ErrDetail([System.Management.Automation.ErrorRecord]$err) {
  Write-Output ("ERROR: {0}" -f $err.Exception.Message)
  if ($err.Exception.Response) {
    try {
      $stream = $err.Exception.Response.GetResponseStream();
      if ($stream) { [System.IO.StreamReader]::new($stream).ReadToEnd() | Write-Output }
    } catch {}
  }
}

function Get-Token {
  param([string]$Username = 'trialuser2', [string]$Password = 'Secret123!')
  $loginBody = @{ usernameOrEmail = $Username; password = $Password } | ConvertTo-Json
  try {
    $login = Invoke-RestMethod -Uri 'http://localhost:9092/auth/login' -Method Post -Body $loginBody -ContentType 'application/json'
    return $login.token
  } catch {
    # Try register then login
    try {
      $regBody = Get-Content -Raw 'c:\dev\sncrwanda-backend\temp_register.json'
      Invoke-RestMethod -Uri 'http://localhost:9092/auth/register' -Method Post -Body $regBody -ContentType 'application/json' | Out-Null
    } catch { Write-ErrDetail $_ }
    $login = Invoke-RestMethod -Uri 'http://localhost:9092/auth/login' -Method Post -Body $loginBody -ContentType 'application/json'
    return $login.token
  }
}

try {
  $token = Get-Token
  if (-not $token) { throw 'No token acquired' }
  Write-Output ("TOKEN_LEN:{0}" -f $token.Length)

  # HR employees
  try {
    $hr = Invoke-RestMethod -Uri 'http://localhost:9094/hr/employees' -Method Get -Headers @{ Authorization = ("Bearer " + $token) } -TimeoutSec 10
  } catch {
    Write-Output ('HR_FAIL_1:' + $_.Exception.Message)
    if ($_.Exception.Response) { $_.Exception.Response.GetResponseStream() | ForEach-Object { [System.IO.StreamReader]::new($_).ReadToEnd() } | Write-Output }
    # Fallback route without /hr prefix
    try {
      $hr = Invoke-RestMethod -Uri 'http://localhost:9094/employees' -Method Get -Headers @{ Authorization = ("Bearer " + $token) } -TimeoutSec 10
      Write-Output 'HR_FALLBACK_OK'
    } catch {
      Write-Output ('HR_FAIL_2:' + $_.Exception.Message)
      if ($_.Exception.Response) { $_.Exception.Response.GetResponseStream() | ForEach-Object { [System.IO.StreamReader]::new($_).ReadToEnd() } | Write-Output }
    }
  }
  if ($hr) { Write-Output ("HR_COUNT:{0}" -f (($hr | Measure-Object).Count)) } else { Write-Output 'HR_COUNT:0' }

  # Ledger transactions
  try {
    $ledger = Invoke-RestMethod -Uri 'http://localhost:9091/transactions' -Method Get -Headers @{ Authorization = ("Bearer " + $token) } -TimeoutSec 10
  } catch {
    Write-Output ('LEDGER_FAIL:' + $_.Exception.Message)
    if ($_.Exception.Response) { $_.Exception.Response.GetResponseStream() | ForEach-Object { [System.IO.StreamReader]::new($_).ReadToEnd() } | Write-Output }
  }
  if ($ledger) { Write-Output ("LEDGER_COUNT:{0}" -f (($ledger | Measure-Object).Count)) } else { Write-Output 'LEDGER_COUNT:0' }

  # Reporting summary (often open to authenticated users)
  try {
    $summary = Invoke-RestMethod -Uri 'http://localhost:9096/reports/summary' -Method Get -Headers @{ Authorization = ("Bearer " + $token) } -TimeoutSec 10
    if ($summary) { Write-Output 'REPORTING_OK' } else { Write-Output 'REPORTING_EMPTY' }
  } catch {
    Write-Output ('REPORTING_FAIL:' + $_.Exception.Message)
  }

} catch {
  Write-ErrDetail $_
  exit 1
}
