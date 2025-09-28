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
      Write-Host "ERROR DETAILS:" -ForegroundColor Yellow
      Write-Host $_.ErrorDetails.Message
    }
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
    $resp = Invoke-Json 'http://localhost:9090/auth/login' 'POST' $loginBody $null
    return $resp.token
  } catch {
    Write-Host 'Admin login failed via gateway, attempting register then login...' -ForegroundColor Yellow
    $regBody = @{ username = 'admin'; email = 'admin@example.com'; password = 'Secret123!' }
    try { Invoke-Json 'http://localhost:9090/auth/register' 'POST' $regBody $null | Out-Null } catch {}
    $resp2 = Invoke-Json 'http://localhost:9090/auth/login' 'POST' $loginBody $null
    return $resp2.token
  }
}

try {
  $token = Get-AdminToken
  if (-not $token) { throw 'Failed to acquire admin token' }
  Write-Host ("TOKEN LEN: {0}" -f $token.Length)

  # Ensure a branch exists
  $branches = @()
  try { $branches = Invoke-Json 'http://localhost:9090/hr/branches' 'GET' $null $token } catch { $branches = @() }
  $branch = $branches | Where-Object { $_.name -eq 'Kigali' } | Select-Object -First 1
  if (-not $branch) {
    $branch = Invoke-Json 'http://localhost:9090/hr/branches' 'POST' @{ name='Kigali'; address='KG 123 St' } $token
  }
  $branchId = $branch.id
  Write-Host "BRANCH_ID: $branchId"

  # Create guardian
  $gBody = @{ fullName='Debug Guardian'; phone='0789999999'; email='debug.guardian@example.com'; address='Kigali' }
  $guardian = Invoke-Json 'http://localhost:9090/students/guardians' 'POST' $gBody $token
  Write-Host ("GUARDIAN_ID: {0}" -f $guardian.id)

  # Create student (explicit branchId)
  $sBody = @{
    guardianId   = $guardian.id
    childName    = 'Debug Student'
    childDob     = '2015-10-10'
    hobbies      = 'Reading'
    needs        = @()
    needsOtherText = $null
    branchId     = $branchId
  }
  $student = Invoke-Json 'http://localhost:9090/students' 'POST' $sBody $token
  Write-Host ("STUDENT_ID: {0}" -f $student.id)

  # List to confirm
  $guards = Invoke-Json 'http://localhost:9090/students/guardians' 'GET' $null $token
  $studs  = Invoke-Json 'http://localhost:9090/students' 'GET' $null $token
  Write-Host ("GUARDIANS_COUNT: {0}" -f ($guards | Measure-Object).Count)
  Write-Host ("STUDENTS_COUNT: {0}" -f ($studs | Measure-Object).Count)
} catch {
  Write-Host ("DEBUG_CREATE_ERROR: {0}" -f $_.Exception.Message) -ForegroundColor Red
  exit 1
}
