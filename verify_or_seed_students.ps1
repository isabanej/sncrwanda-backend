param(
  [string]$Username = 'emino',
  [string]$Password = 'Secret123!'
)
$ErrorActionPreference = 'Stop'
Write-Host "== Student visibility verification =="
# 1. Login
$loginBody = @{ usernameOrEmail = $Username; password = $Password } | ConvertTo-Json
try {
  $login = Invoke-RestMethod -Uri http://localhost:9090/auth/login -Method Post -Body $loginBody -ContentType 'application/json'
} catch {
  Write-Host "Login failed: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
if(-not $login.token){ Write-Host 'No token returned' -ForegroundColor Red; exit 1 }
$token = $login.token
$headers = @{ Authorization = "Bearer $token"; Accept='application/json' }
Write-Host "Logged in as $Username (token length=$($token.Length))"

function Get-Students {
  try { return Invoke-RestMethod -Uri http://localhost:9090/students -Headers $headers -Method Get } catch { return @() }
}

$students = Get-Students
$initialCount = @($students).Count
Write-Host "Initial /students count: $initialCount"

if($initialCount -eq 0){
  Write-Host 'No active students found; seeding one guardian + one student...' -ForegroundColor Yellow
  # Create guardian
  $gBody = @{ fullName = 'Guardian Demo'; phone='0780000000'; email='guardian.demo@example.com'; address='Kigali' } | ConvertTo-Json
  try {
    $guardian = Invoke-RestMethod -Uri http://localhost:9090/students/guardians -Method Post -Body $gBody -Headers $headers -ContentType 'application/json'
    Write-Host "Created guardian: $($guardian.id)" -ForegroundColor Green
  } catch {
    Write-Host "Failed creating guardian: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
  }
  # Create student
  $sBody = @{ guardianId = $guardian.id; childName='Demo Child'; childDob='2015-01-10'; hobbies='Reading'; needs=@(); needsOtherText=$null } | ConvertTo-Json
  try {
    $student = Invoke-RestMethod -Uri http://localhost:9090/students -Method Post -Body $sBody -Headers $headers -ContentType 'application/json'
    Write-Host "Created student: $($student.id) $($student.childName)" -ForegroundColor Green
  } catch {
    Write-Host "Failed creating student: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
  }
  Start-Sleep -Seconds 1
  $students = Get-Students
}

$finalCount = @($students).Count
Write-Host "Final /students count: $finalCount" -ForegroundColor Cyan
if($finalCount -gt 0){
  $preview = $students | Select-Object -First 5 | ForEach-Object { "$(if($_.id){$_.id}else{'(no id)'}) :: $(if($_.childName){ $_.childName } else { '(no childName)' })" }
  Write-Host 'Sample students:'
  $preview | ForEach-Object { Write-Host ' - ' $_ }
} else {
  Write-Host 'Still zero students after seeding attempt.' -ForegroundColor Red
}

Write-Host 'Done.'
