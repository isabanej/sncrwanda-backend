$ErrorActionPreference = 'Stop'

function Invoke-Json($uri, $method, $body, $token) {
  $headers = @{}
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  if ($null -ne $body -and ($body -isnot [string])) { $body = ($body | ConvertTo-Json -Depth 8) }
  try {
    return Invoke-RestMethod -Uri $uri -Method $method -Headers $headers -ContentType 'application/json' -Body $body
  } catch {
    $code = 0; $bodyText = $null
    if ($_.Exception.Response) {
      try { $code = [int]$_.Exception.Response.StatusCode } catch {}
      try { $bodyText = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream()).ReadToEnd() } catch {}
    }
    if (-not $code -and $_.ErrorDetails -and $_.ErrorDetails.Message) {
      try { $err = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction Stop; $code = $err.status } catch {}
    }
    $msg = $null
    if ($bodyText) { $msg = $bodyText } else { $msg = $_.Exception.Message }
    throw [System.Exception]::new("HTTP $method $uri failed ($code): $msg")
  }
}

function Get-Token($user, $pass) {
  $loginBody = @{ usernameOrEmail = $user; password = $pass }
  $resp = Invoke-Json 'http://localhost:9090/auth/login' 'POST' $loginBody $null
  return $resp.token
}

try {
  # 0) Login as SUPER_ADMIN
  $user = 'emino'; $pass = '123456'
  $token = Get-Token $user $pass
  if (-not $token) { throw 'Failed to acquire token for emino' }
  Write-Host ("TOKEN LEN: {0}" -f $token.Length)

  # 1) Seed a guardian
  $suffix = (Get-Date).ToString('yyyyMMddHHmmss')
  $gBody = @{ fullName = "Guardian Flow $suffix"; phone = '0788123456'; email = "g$suffix@example.com"; address = 'Kigali' }
  $guardian = Invoke-Json 'http://localhost:9090/students/guardians' 'POST' $gBody $token
  $guardianId = $guardian.id
  Write-Host ("GUARDIAN_ID: {0}" -f $guardianId)

  # 2) Create a student (ensure branch set via token or default)
  $sBody = @{ guardianId = $guardianId; childName = "Flow Student $suffix"; childDob = '2018-09-10'; hobbies = 'drawing'; needs = @('LEARNING'); needsOtherText = $null }
  $student = Invoke-Json 'http://localhost:9090/students' 'POST' $sBody $token
  $studentId = $student.id
  Write-Host ("STUDENT_ID: {0}" -f $studentId)

  # 3) List active and confirm present
  $active = Invoke-Json 'http://localhost:9090/students' 'GET' $null $token
  $present = $active | Where-Object { $_.id -eq $studentId }
  if (-not $present) { throw 'Student not present in active list after creation' }
  Write-Host 'ACTIVE_OK' -ForegroundColor Green

  # 4) Soft delete via gateway
  Invoke-Json ("http://localhost:9090/students/{0}" -f $studentId) 'DELETE' $null $token
  Write-Host 'DELETE_OK' -ForegroundColor Green

  # 5) Verify not in active, appears in archived
  $active2 = Invoke-Json 'http://localhost:9090/students' 'GET' $null $token
  $present2 = $active2 | Where-Object { $_.id -eq $studentId }
  if ($present2) { throw 'Deleted student still present in active list' }
  $arch = Invoke-Json 'http://localhost:9090/students?archived=true' 'GET' $null $token
  $inArch = $arch | Where-Object { $_.id -eq $studentId }
  if (-not $inArch) { throw 'Deleted student not found in archived list' }
  Write-Host 'ARCHIVE_OK' -ForegroundColor Green

  # 6) Restore
  Invoke-Json ("http://localhost:9090/students/{0}/restore" -f $studentId) 'POST' @{} $token
  Write-Host 'RESTORE_OK' -ForegroundColor Green

  # 7) Verify back in active
  $active3 = Invoke-Json 'http://localhost:9090/students' 'GET' $null $token
  $present3 = $active3 | Where-Object { $_.id -eq $studentId }
  if (-not $present3) { throw 'Restored student not present in active list' }
  Write-Host 'ACTIVE_AFTER_RESTORE_OK' -ForegroundColor Green

  # 8) Update
  $upd = @{ guardianId = $guardianId; childName = "Flow Student $suffix (Updated)"; childDob = '2018-09-10'; hobbies = 'drawing, music'; needs = @('LEARNING'); needsOtherText = $null }
  $updated = Invoke-Json ("http://localhost:9090/students/{0}" -f $studentId) 'PUT' $upd $token
  if ($updated.childName -notlike '*Updated*') { throw 'Update did not persist changes' }
  Write-Host 'UPDATE_OK' -ForegroundColor Green

  Write-Host 'STUDENT_ARCHIVE_FLOW: PASS' -ForegroundColor Green
  exit 0
} catch {
  Write-Host ("STUDENT_ARCHIVE_FLOW: FAIL - {0}" -f $_.Exception.Message) -ForegroundColor Red
  exit 1
}
