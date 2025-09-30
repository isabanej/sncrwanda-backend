param(
  [string]$BaseGatewayUrl = 'http://localhost:9090',
  [string]$AuthBase = 'http://localhost:9092'
)

function Wait-ServiceUp($url, $name){
  Write-Host "Waiting for $name ..."
  for($i=1;$i -le 60;$i++){
    try { $r = Invoke-RestMethod "$url/actuator/health" -TimeoutSec 5; if($r.status -eq 'UP'){ Write-Host "$name UP"; return } } catch {}
    Start-Sleep -Seconds 2
  }
  throw "$name not UP after timeout"
}

Wait-ServiceUp $AuthBase 'auth-service'
Wait-ServiceUp "$BaseGatewayUrl/students" 'gateway (proxy check via students path)'

# Register/Login single user
$regBody = @{ username='demo'; email='demo@example.com'; password='Secret123!' } | ConvertTo-Json
try { Invoke-RestMethod "$AuthBase/auth/register" -Method Post -Body $regBody -ContentType 'application/json' | Out-Null } catch { }
$loginBody = @{ usernameOrEmail='demo'; password='Secret123!' } | ConvertTo-Json
$login = Invoke-RestMethod "$AuthBase/auth/login" -Method Post -Body $loginBody -ContentType 'application/json'
$token = $login.token
$h = @{ Authorization = "Bearer $token" }
Write-Host "Obtained token length: $($token.Length)"

# Guardian + Student seeding (only if none)
$students = Invoke-RestMethod "$BaseGatewayUrl/students/select" -Headers $h
if($students.Count -eq 0){
  Write-Host 'Seeding guardian + student...'
  $guardian = @{ fullName='Jane Guardian'; phone='0788000000'; email='guardian@example.com' } | ConvertTo-Json
  $g = Invoke-RestMethod "$BaseGatewayUrl/guardians" -Method Post -Headers $h -Body $guardian -ContentType 'application/json'
  $studentReq = @{ guardianId=$g.id; childName='Child One'; childDob='2014-01-15'; hobbies='Reading'; needs=@('FOOD'); needsOtherText=$null } | ConvertTo-Json -Depth 5
  Invoke-RestMethod "$BaseGatewayUrl/students" -Method Post -Headers $h -Body $studentReq -ContentType 'application/json' | Out-Null
}

# Teacher seeding (if none)
$teachers = Invoke-RestMethod "$BaseGatewayUrl/hr/employees/teachers" -Headers $h
if($teachers.Count -eq 0){
  Write-Host 'Seeding branch, department, teacher employee...'
  # Create branch
  $branch = @{ name='Main Branch'; address='Kigali' } | ConvertTo-Json
  $b = Invoke-RestMethod "$BaseGatewayUrl/hr/branches" -Method Post -Headers $h -Body $branch -ContentType 'application/json'
  # Create department
  $dept = @{ name='Academics'; branch=@{ id=$b.id } } | ConvertTo-Json -Depth 4
  $d = Invoke-RestMethod "$BaseGatewayUrl/hr/departments" -Method Post -Headers $h -Body $dept -ContentType 'application/json'
  # Create employee teacher
  $emp = @{
    fullName='John Teacher'; dob='1990-05-01'; address='Kigali'; position='TEACHER'; salary=1200; phone='0788111111'; email='jteach@example.com'; active=$true; department=@{ id=$d.id }; branch=@{ id=$b.id }
  } | ConvertTo-Json -Depth 6
  Invoke-RestMethod "$BaseGatewayUrl/hr/employees" -Method Post -Headers $h -Body $emp -ContentType 'application/json' | Out-Null
}

# Fetch summaries
$students = Invoke-RestMethod "$BaseGatewayUrl/students/select" -Headers $h
$teacherList = Invoke-RestMethod "$BaseGatewayUrl/hr/employees/teachers" -Headers $h
$summary = Invoke-RestMethod "$BaseGatewayUrl/reports/summary" -Headers $h
$studentSummary = Invoke-RestMethod "$BaseGatewayUrl/reports/students/summary" -Headers $h

Write-Host "Students: $($students.Count); Teachers: $($teacherList.Count)"
Write-Host "Summary(employeeCount=${summary.employeeCount}, studentCount=${summary.studentCount})"
Write-Host "StudentSummary(total=${studentSummary.totalStudents}, active=${studentSummary.activeStudents})"
