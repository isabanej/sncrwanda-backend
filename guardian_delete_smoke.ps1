# Smoke test for Guardian soft-delete via student-service (direct)
param(
  [string]$AuthUrl = 'http://localhost:9092/auth/login',
  [string]$StudentUrlBase = 'http://localhost:9095/students'
)

function Show-HttpError($err) {
  Write-Output "ERROR: $($err.Exception.Message)"
  if ($err.Exception.Response) {
    try {
      $respStream = $err.Exception.Response.GetResponseStream()
      if ($respStream) { [System.IO.StreamReader]::new($respStream).ReadToEnd() | Write-Output }
    } catch { }
  }
}

try {
  $loginBody = @{ usernameOrEmail = 'emino'; password = '123456' } | ConvertTo-Json
  Write-Output "HTTP POST $AuthUrl"
  $login = Invoke-RestMethod -Uri $AuthUrl -Method Post -Body $loginBody -ContentType 'application/json' -ErrorAction Stop
  $token = $login.token
  Write-Output ("TOKEN_LEN: " + $token.Length)
} catch {
  Show-HttpError $_
  exit 1
}

# Create a guardian
$gEmail = ('delete-smoke-' + (Get-Date -Format yyyyMMddHHmmss) + '-' + ([guid]::NewGuid().ToString('N').Substring(0,6)) + '@example.com')
$gBody = @{ email = $gEmail; fullName = ('Delete Smoke ' + (Get-Date -Format yyyyMMddHHmmss)); phone = '0789 111 222'; address = 'Kigali' } | ConvertTo-Json
try {
  $createUrl = "$StudentUrlBase/guardians"
  Write-Output "HTTP POST $createUrl"
  Write-Output "BODY: $gBody"
  $created = Invoke-RestMethod -Uri $createUrl -Method Post -Headers @{ Authorization = "Bearer $token" } -Body $gBody -ContentType 'application/json' -ErrorAction Stop
  $id = $created.id
  if (-not $id) { Write-Output 'CREATE_FAIL: No ID returned'; exit 1 }
  Write-Output "CREATED_ID: $id"
} catch {
  Show-HttpError $_
  exit 1
}

# Delete the guardian (soft delete)
try {
  $delUrl = "$StudentUrlBase/guardians/$id"
  Write-Output "HTTP DELETE $delUrl"
  $delResp = Invoke-WebRequest -Uri $delUrl -Method Delete -Headers @{ Authorization = "Bearer $token" } -ErrorAction Stop -UseBasicParsing
  $status = [int]$delResp.StatusCode
  Write-Output ("DELETE_STATUS: " + $status)
  if ($status -ne 204) { Write-Output "DELETE_FAIL: Expected 204"; exit 1 }
} catch {
  Show-HttpError $_
  exit 1
}

# Verify archived appears
try {
  $archUrl = "$StudentUrlBase/guardians?archived=true"
  Write-Output "HTTP GET $archUrl"
  $archived = Invoke-RestMethod -Uri $archUrl -Method Get -Headers @{ Authorization = "Bearer $token" } -ErrorAction Stop
  $found = $false
  foreach ($g in $archived) { if ($g.id -eq $id) { $found = $true; break } }
  Write-Output ("ARCHIVED_VISIBLE: " + ($found))
  if (-not $found) { Write-Output 'VERIFY_FAIL: Deleted record not in archived list'; exit 1 }
  Write-Output 'PASS: Soft delete archived successfully.'
  exit 0
} catch {
  Show-HttpError $_
  exit 1
}
