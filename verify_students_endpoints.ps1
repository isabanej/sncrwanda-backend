$ErrorActionPreference = 'Stop'

function Get-Token {
  param([string]$User = 'trialuser2', [string]$Pass = 'Secret123!')
  $loginBody = @{ usernameOrEmail = $User; password = $Pass } | ConvertTo-Json -Compress
  try {
    $login = Invoke-RestMethod -Uri 'http://localhost:9090/auth/login' -Method Post -Body $loginBody -ContentType 'application/json'
    if (-not $login.token) { throw 'No token returned' }
    return $login.token
  } catch {
    # Try to register, then login again
    try {
      $regBody = Get-Content -Raw 'c:\dev\sncrwanda-backend\temp_register.json'
      Invoke-RestMethod -Uri 'http://localhost:9090/auth/register' -Method Post -Body $regBody -ContentType 'application/json' | Out-Null
    } catch {}
    $login = Invoke-RestMethod -Uri 'http://localhost:9090/auth/login' -Method Post -Body $loginBody -ContentType 'application/json'
    if (-not $login.token) { throw 'No token returned after register' }
    return $login.token
  }
}

function Ensure-Student([hashtable]$Headers) {
  $list = Invoke-RestMethod -Uri 'http://localhost:9090/students' -Headers $Headers -TimeoutSec 20
  if (($list | Measure-Object).Count -gt 0) { return $list }

  # Need to create a guardian first
  try {
    $gBody = Get-Content -Raw 'c:\dev\sncrwanda-backend\temp_guardian.json'
    $createdG = Invoke-RestMethod -Uri 'http://localhost:9090/students/guardians' -Method Post -Body $gBody -Headers $Headers -ContentType 'application/json' -TimeoutSec 20
    $gId = $createdG.id
  } catch {
    # Fallback: pick any guardian
    $gl = Invoke-RestMethod -Uri 'http://localhost:9090/students/guardians' -Headers $Headers -TimeoutSec 20
    if (($gl | Measure-Object).Count -gt 0) { $gId = $gl[0].id } else { throw 'No guardian available to create a student' }
  }

  $studentPayload = @{
    guardianId = $gId
    childName = ('Verify Child ' + ([DateTime]::UtcNow.ToString('HHmmss')))
    childDob = '2019-01-01'
    hobbies = 'testing'
    needs = @()
    needsOtherText = $null
  } | ConvertTo-Json -Compress

  $createdS = Invoke-RestMethod -Uri 'http://localhost:9090/students' -Method Post -Headers $Headers -ContentType 'application/json' -Body $studentPayload -TimeoutSec 20
  return ,$createdS # ensure array
}

try {
  $token = Get-Token
  Write-Output ("TOKEN_OK:{0}" -f $token.Length)
  $h = @{ Authorization = ("Bearer " + $token) }

  $active = Invoke-RestMethod -Uri 'http://localhost:9090/students' -Headers $h -TimeoutSec 20
  if (($active | Measure-Object).Count -eq 0) {
    $active = Ensure-Student -Headers $h
  }
  $arch = Invoke-RestMethod -Uri 'http://localhost:9090/students?archived=true' -Headers $h -TimeoutSec 20
  Write-Output ("COUNTS active={0} archived={1}" -f (($active | Measure-Object).Count), (($arch | Measure-Object).Count))

  if (($active | Measure-Object).Count -gt 0) {
    $target = $active[0]
    Write-Output ("SOFT_DELETE id={0} name={1}" -f $target.id, $target.childName)
    Invoke-RestMethod -Uri ("http://localhost:9090/students/{0}" -f $target.id) -Method Delete -Headers $h -TimeoutSec 20 | Out-Null
    Start-Sleep -Milliseconds 300
    $arch2 = Invoke-RestMethod -Uri 'http://localhost:9090/students?archived=true' -Headers $h -TimeoutSec 20
    Write-Output ("ARCHIVED_AFTER_DELETE count={0}" -f (($arch2 | Measure-Object).Count))

    Write-Output ("RESTORE id={0}" -f $target.id)
    Invoke-RestMethod -Uri ("http://localhost:9090/students/{0}/restore" -f $target.id) -Method Post -Headers $h -TimeoutSec 20 | Out-Null
    Start-Sleep -Milliseconds 300
    $active2 = Invoke-RestMethod -Uri 'http://localhost:9090/students' -Headers $h -TimeoutSec 20
    Write-Output ("ACTIVE_AFTER_RESTORE count={0}" -f (($active2 | Measure-Object).Count))
  } else {
    Write-Output 'NO_ACTIVE_STUDENTS to exercise delete/restore'
  }

  # Re-fetch active for update step
  $active = Invoke-RestMethod -Uri 'http://localhost:9090/students' -Headers $h -TimeoutSec 20
  if (($active | Measure-Object).Count -gt 0) {
    $target2 = $active[0]
    $payload = [ordered]@{
      guardianId = $target2.guardianId
      childName = $target2.childName
      childDob = $target2.childDob
      hobbies = 'Edited via verify script'
      needs = $target2.needs
      needsOtherText = $target2.needsOtherText
    } | ConvertTo-Json -Depth 6
    Write-Output ("UPDATE id={0}" -f $target2.id)
    $updated = Invoke-RestMethod -Uri ("http://localhost:9090/students/{0}" -f $target2.id) -Method Put -Headers $h -ContentType 'application/json' -Body $payload -TimeoutSec 20
    Write-Output ("UPDATED_OK hobbies='{0}'" -f $updated.hobbies)
  }

  Write-Output 'DONE'
} catch {
  Write-Output ("ERROR: {0}" -f $_.Exception.Message)
  if ($_.Exception.Response) { $_.Exception.Response.GetResponseStream() | ForEach-Object { [System.IO.StreamReader]::new($_).ReadToEnd() } }
  exit 1
}
