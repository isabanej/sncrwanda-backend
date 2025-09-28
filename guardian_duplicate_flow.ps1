$ErrorActionPreference = 'Stop'

function Invoke-Json($uri, $method, $body, $token) {
  $headers = @{}
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  if ($null -ne $body -and ($body -isnot [string])) { $body = ($body | ConvertTo-Json -Depth 8) }
  Write-Host "HTTP $method $uri" -ForegroundColor Cyan
  if ($body) { Write-Host "BODY: $body" -ForegroundColor DarkGray }
  try {
    return Invoke-RestMethod -Uri $uri -Method $method -Headers $headers -ContentType 'application/json' -Body $body
  } catch {
    Write-Host ("ERROR calling {0}: {1}" -f $uri, $_.Exception.Message) -ForegroundColor Red
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
      Write-Host 'ERROR DETAILS:' -ForegroundColor Yellow
      Write-Host $_.ErrorDetails.Message
    }
    if ($_.Exception.Response) {
      try {
        $respBody = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()).ReadToEnd()
        Write-Host 'RESPONSE BODY:' -ForegroundColor Yellow
        Write-Host $respBody
      } catch {}
    }
    throw
  }
}

function Get-Token($user, $pass) {
  $loginBody = @{ usernameOrEmail = $user; password = $pass }
  $resp = Invoke-Json 'http://localhost:9090/auth/login' 'POST' $loginBody $null
  return $resp.token
}

try {
  $user = 'emino'; $pass = '123456'
  $token = Get-Token $user $pass
  if (-not $token) { throw 'Failed to acquire token for emino' }
  Write-Host ("USER: {0}" -f $user)
  Write-Host ("TOKEN LEN: {0}" -f $token.Length)

  # Unique test name to avoid clashes across runs
  $suffix = (Get-Date).ToString('yyyyMMddHHmmss')
  $name = "Guardian Test $suffix"

  # 1) Create guardian with local format
  $createBody = @{
    fullName = $name
    phone = '0789 123 456'
    email = "test-$suffix@example.com"
    address = 'Kigali'
  }
  $created = Invoke-Json 'http://localhost:9090/students/guardians' 'POST' $createBody $token
  Write-Host ("CREATED_ID: {0}" -f $created.id)

  # 2) Attempt duplicate with country code format (+250)
  $dupBody = @{
    fullName = $name
    phone = '+250 789 123 456'
    email = "testdup-$suffix@example.com"
    address = 'Kigali'
  }
  $dupUrl = 'http://localhost:9090/students/guardians'
  Write-Host 'EXPECTING 409 Conflict on duplicate...' -ForegroundColor Yellow
  try {
    $dup = Invoke-RestMethod -Uri $dupUrl -Method Post -Headers @{ Authorization = "Bearer $token" } -ContentType 'application/json' -Body ($dupBody | ConvertTo-Json -Depth 8) -ErrorAction Stop
    Write-Host 'UNEXPECTED: Duplicate creation succeeded' -ForegroundColor Red
    $dup | ConvertTo-Json -Depth 6
    exit 2
  } catch {
    $resp = $_.Exception.Response
    $code = $null
    $body = $null
    if ($resp) {
      try { $code = [int]$resp.StatusCode } catch {}
      try {
        $stream = $resp.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $body = $reader.ReadToEnd()
        }
      } catch {}
    }
    if (-not $body -and $_.ErrorDetails -and $_.ErrorDetails.Message) { $body = $_.ErrorDetails.Message }
    if (-not $code) { $code = 0 }
    Write-Host ("DUPLICATE_STATUS: {0}" -f $code)
    if ($body) { Write-Host 'DUPLICATE_BODY:'; Write-Host $body }
    if ($code -eq 409) {
      Write-Host 'PASS: Duplicate properly blocked with 409 Conflict.' -ForegroundColor Green
      exit 0
    } else {
      Write-Host ("FAIL: Expected 409, got {0}" -f $code) -ForegroundColor Red
      exit 3
    }
  }
} catch {
  Write-Host ("GUARDIAN_DUPLICATE_FLOW_ERROR: {0}" -f $_.Exception.Message) -ForegroundColor Red
  exit 1
}
