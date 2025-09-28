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
    if ($_.Exception.Response) {
      try {
        $respBody = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()).ReadToEnd()
        Write-Host "RESPONSE BODY:" -ForegroundColor Yellow
        Write-Host $respBody
      } catch {}
    }
    throw
  }
}

function Get-AdminToken {
  $loginBody = @{ usernameOrEmail = 'admin'; password = 'Secret123!' }
  try {
    $resp = Invoke-Json 'http://localhost:9092/auth/login' 'POST' $loginBody $null
    return $resp.token
  } catch {
    Write-Host 'Admin login failed direct to auth-service, attempting register then login...' -ForegroundColor Yellow
    $regBody = @{ username = 'admin'; email = 'admin@example.com'; password = 'Secret123!' }
    try { Invoke-Json 'http://localhost:9092/auth/register' 'POST' $regBody $null | Out-Null } catch {}
    $resp2 = Invoke-Json 'http://localhost:9092/auth/login' 'POST' $loginBody $null
    return $resp2.token
  }
}

try {
  $token = Get-AdminToken
  if (-not $token) { throw 'Failed to acquire admin token' }
  Write-Host ("TOKEN LEN: {0}" -f $token.Length)

  # Ensure branch exists via hr-service direct
  $branches = @()
  try { $branches = Invoke-Json 'http://localhost:9094/branches' 'GET' $null $token } catch { $branches = @() }
  $branch = $branches | Where-Object { $_.name -eq 'Kigali' } | Select-Object -First 1
  if (-not $branch) {
    $branch = Invoke-Json 'http://localhost:9094/branches' 'POST' @{ name='Kigali'; address='KG 123 St' } $token
  }
  $branchId = $branch.id
  Write-Host "BRANCH_ID: $branchId"

  # Create guardian via student-service direct
  $gBody = @{ fullName='Direct Guardian'; phone='0782222333'; email='direct.guardian@example.com'; address='Kigali' }
  $guardian = Invoke-Json 'http://localhost:9095/students/guardians' 'POST' $gBody $token
  Write-Host ("GUARDIAN_ID: {0}" -f $guardian.id)

  # Create student via student-service direct
  $sBody = @{
    guardianId   = $guardian.id
    childName    = 'Direct Student'
    childDob     = '2015-09-09'
    hobbies      = 'Reading'
    needs        = @()
    needsOtherText = $null
    branchId     = $branchId
  }
  $student = Invoke-Json 'http://localhost:9095/students' 'POST' $sBody $token
  Write-Host ("STUDENT_ID: {0}" -f $student.id)

  $studs  = Invoke-Json 'http://localhost:9095/students' 'GET' $null $token
  Write-Host ("STUDENTS_COUNT: {0}" -f ($studs | Measure-Object).Count)
} catch {
  Write-Host ("DEBUG_DIRECT_CREATE_ERROR: {0}" -f $_.Exception.Message) -ForegroundColor Red
  exit 1
}
