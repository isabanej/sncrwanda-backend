$ErrorActionPreference = 'Stop'
Write-Host '--- Reset superadmin (Emino) and verify students ---' -ForegroundColor Cyan
# 1. Reset / register emino
& "$PSScriptRoot/reset_emino.ps1" | Out-Null
# 2. Login again to ensure fresh token
$loginBody = @{ usernameOrEmail='Emino'; password='Secret123!' } | ConvertTo-Json
$login = Invoke-RestMethod -Uri 'http://localhost:9090/auth/login' -Method Post -Body $loginBody -ContentType 'application/json'
$token = $login.token
if(-not $token){ throw 'Token missing after login' }
$h = @{ Authorization = "Bearer $token"; Accept='application/json' }

function Get-Students { try { Invoke-RestMethod -Uri 'http://localhost:9090/students' -Headers $h -Method Get } catch { @() } }

$students = Get-Students
$c = @($students).Count
Write-Host "Active students count: $c"
if($c -eq 0){
  Write-Host 'Seeding guardian + student...' -ForegroundColor Yellow
  $gBody = @{ fullName='Guardian Bulk'; phone='0781111111'; email='g.bulk@example.com'; address='Kigali' } | ConvertTo-Json
  $g = Invoke-RestMethod -Uri 'http://localhost:9090/students/guardians' -Method Post -Body $gBody -Headers $h -ContentType 'application/json'
  $sBody = @{ guardianId=$g.id; childName='Child Bulk'; childDob='2015-03-15'; hobbies='Soccer'; needs=@(); needsOtherText=$null } | ConvertTo-Json
  $s = Invoke-RestMethod -Uri 'http://localhost:9090/students' -Method Post -Body $sBody -Headers $h -ContentType 'application/json'
  Start-Sleep -Seconds 1
  $students = Get-Students
  $c = @($students).Count
  Write-Host "Post-seed students count: $c" -ForegroundColor Green
}
Write-Host 'Sample:'
$students | Select-Object -First 5 | ForEach-Object { Write-Host (' - ' + $_.id + ' :: ' + $_.childName) }
Write-Host 'Done.'
