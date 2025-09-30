# Seed end-to-end demo data across services and print created IDs
$ErrorActionPreference = 'Stop'

function Invoke-Json($uri, $method, $body, $token) {
  $headers = @{}
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  if ($body -ne $null -and ($body -isnot [string])) { $body = ($body | ConvertTo-Json -Depth 8) }
  return Invoke-RestMethod -Uri $uri -Method $method -Headers $headers -ContentType 'application/json' -Body $body
}

try {
  # 1) Register SUPER_ADMIN (first user) if not present, then login
  $registerBody = @{ username = 'admin'; email = 'admin@example.com'; password = 'Secret123!' }
  try {
    $reg = Invoke-Json 'http://localhost:9092/auth/register' 'POST' $registerBody $null
    Write-Output 'REGISTER_RESPONSE:'
    $reg | ConvertTo-Json -Depth 6
  } catch {
    Write-Output "REGISTER_FAILED_OR_ALREADY_EXISTS: $($_.Exception.Message)"
  }

  $loginBody = @{ usernameOrEmail = 'admin'; password = 'Secret123!' }
  $login = Invoke-Json 'http://localhost:9092/auth/login' 'POST' $loginBody $null
  Write-Output 'LOGIN_RESPONSE:'
  $login | ConvertTo-Json -Depth 6
  $token = $login.token
  $me = Invoke-RestMethod -Uri 'http://localhost:9092/auth/me' -Method Get -Headers @{ Authorization = "Bearer $token" }
  $adminUserId = $me.id
  Write-Output "ADMIN_USER_ID: $adminUserId"

  # 2) Create branch (Kigali)
  $branchBody = @{ name = 'Kigali'; address = 'KG 123 St' }
  $branch = Invoke-Json 'http://localhost:9094/branches' 'POST' $branchBody $token
  $branchId = $branch.id
  Write-Output "BRANCH_ID: $branchId"

  # 3) Create department in Kigali branch
  $deptBody = @{ name = 'Academics'; branchId = $branchId }
  $dept = Invoke-Json 'http://localhost:9094/departments' 'POST' $deptBody $token
  $deptId = $dept.id
  Write-Output "DEPARTMENT_ID: $deptId"

  # 4) Create guardian
  $guardianBody = @{ fullName = 'Jane Doe'; phone = '0780000000'; email='jane@example.com'; address='Kigali' }
  $guardian = Invoke-Json 'http://localhost:9095/students/guardians' 'POST' $guardianBody $token
  $guardianId = $guardian.id
  Write-Output "GUARDIAN_ID: $guardianId"

  # 5) Create student in Kigali branch
  $studentBody = @{ guardianId = $guardianId; childName='Alice'; childDob='2015-02-10'; hobbies='Football'; needs=@(); needsOtherText=$null; branchId=$branchId }
  $student = Invoke-Json 'http://localhost:9095/students' 'POST' $studentBody $token
  $studentId = $student.id
  Write-Output "STUDENT_ID: $studentId"

  # 6) Student reports removed - skipped

  # 7) Create a ledger transaction for Kigali branch
  $txBody = @{ type='INCOME'; category='Tuition'; name='Term fees'; materials=@('books'); amount=1500.00; txDate=(Get-Date -Format 'yyyy-MM-dd'); notes='Term 1'; branchId=$branchId }
  $tx = Invoke-Json 'http://localhost:9091/transactions' 'POST' $txBody $token
  $txId = $tx.id
  Write-Output "TRANSACTION_ID: $txId"

  # 8) Dashboard summary
  $summary = Invoke-RestMethod -Uri 'http://localhost:9096/reports/summary' -Method Get -Headers @{ Authorization = "Bearer $token" }
  Write-Output 'DASHBOARD_SUMMARY:'
  $summary | ConvertTo-Json -Depth 6

} catch {
  Write-Output "SEED_DEMO_ERROR: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    $_.Exception.Response.GetResponseStream() | % { [System.IO.StreamReader]::new($_).ReadToEnd() }
  }
  exit 1
}

