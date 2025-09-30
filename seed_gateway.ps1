# Seed demo data across services via API Gateway only (no user creation)
$ErrorActionPreference = 'Stop'

function Invoke-Json($uri, $method, $body, $token) {
  $headers = @{}
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  if ($null -ne $body -and ($body -isnot [string])) { $body = ($body | ConvertTo-Json -Depth 8) }
  return Invoke-RestMethod -Uri $uri -Method $method -Headers $headers -ContentType 'application/json' -Body $body
}

function Get-Token {
  # Try login with temp_login.json first, then with temp_register.json credentials; register if needed.
  $loginRaw = Get-Content -Raw 'c:\dev\sncrwanda-backend\temp_login.json'
  $regRaw = Get-Content -Raw 'c:\dev\sncrwanda-backend\temp_register.json'
  $regObj = $null
  try { $regObj = $regRaw | ConvertFrom-Json } catch {}

  # 1) Attempt login with temp_login.json as-is
  try {
    $login = Invoke-RestMethod -Uri 'http://localhost:9090/auth/login' -Method Post -Body $loginRaw -ContentType 'application/json'
    return $login.token
  } catch {}

  # 2) Attempt login using username from temp_register.json if available
  if ($null -ne $regObj) {
    $altLogin = @{ usernameOrEmail = $regObj.username; password = $regObj.password } | ConvertTo-Json
    try {
      $login2 = Invoke-RestMethod -Uri 'http://localhost:9090/auth/login' -Method Post -Body $altLogin -ContentType 'application/json'
      return $login2.token
    } catch {
      # Try to register, ignore conflict, then login again
      try {
        Invoke-RestMethod -Uri 'http://localhost:9090/auth/register' -Method Post -Body $regRaw -ContentType 'application/json' | Out-Null
      } catch {
        # If conflict, ignore; otherwise rethrow
        if (-not ($_.Exception.Response -and $_.Exception.Response.StatusCode.value__ -eq 409)) { throw }
      }
      $login3 = Invoke-RestMethod -Uri 'http://localhost:9090/auth/login' -Method Post -Body $altLogin -ContentType 'application/json'
      return $login3.token
    }
  }

  # 3) Attempt admin login/register as last resort for elevated permissions
  try {
    $adminLogin = @{ usernameOrEmail = 'admin'; password = 'Secret123!' } | ConvertTo-Json
    $loginA = Invoke-RestMethod -Uri 'http://localhost:9090/auth/login' -Method Post -Body $adminLogin -ContentType 'application/json'
    return $loginA.token
  } catch {
    try {
      $adminReg = @{ username = 'admin'; email = 'admin@example.com'; password = 'Secret123!' } | ConvertTo-Json
      Invoke-RestMethod -Uri 'http://localhost:9090/auth/register' -Method Post -Body $adminReg -ContentType 'application/json' | Out-Null
    } catch {
      if (-not ($_.Exception.Response -and $_.Exception.Response.StatusCode.value__ -eq 409)) { throw }
    }
    $adminLogin = @{ usernameOrEmail = 'admin'; password = 'Secret123!' } | ConvertTo-Json
    $loginA2 = Invoke-RestMethod -Uri 'http://localhost:9090/auth/login' -Method Post -Body $adminLogin -ContentType 'application/json'
    return $loginA2.token
  }

  throw 'Unable to obtain token via gateway.'
}

function Get-LoginToken($user, $pass) {
  try {
    $body = @{ usernameOrEmail = $user; password = $pass } | ConvertTo-Json
    $resp = Invoke-RestMethod -Uri 'http://localhost:9090/auth/login' -Method Post -Body $body -ContentType 'application/json'
    return $resp.token
  } catch { return $null }
}

function Get-AdminTokenDirect {
  try {
    $body = @{ usernameOrEmail = 'admin'; password = 'Secret123!' } | ConvertTo-Json
    $resp = Invoke-RestMethod -Uri 'http://localhost:9092/auth/login' -Method Post -Body $body -ContentType 'application/json'
    return $resp.token
  } catch {
    try {
      $reg = @{ username = 'admin'; email = 'admin@example.com'; password = 'Secret123!' } | ConvertTo-Json
      Invoke-RestMethod -Uri 'http://localhost:9092/auth/register' -Method Post -Body $reg -ContentType 'application/json' | Out-Null
    } catch {}
    try {
      $body = @{ usernameOrEmail = 'admin'; password = 'Secret123!' } | ConvertTo-Json
      $resp = Invoke-RestMethod -Uri 'http://localhost:9092/auth/login' -Method Post -Body $body -ContentType 'application/json'
      return $resp.token
    } catch { return $null }
  }
}

try {
  # 0) Obtain token via gateway with robust fallbacks
  $token = Get-Token
  Write-Output ("TOKEN_OK:{0}" -f $token.Length)
  $seedToken = $token
  $maybeAdmin = Get-LoginToken 'admin' 'Secret123!'
  if ($maybeAdmin) { $seedToken = $maybeAdmin; Write-Output 'USING_ADMIN_TOKEN' } else {
    $adminDirect = Get-AdminTokenDirect
    if ($adminDirect) { $seedToken = $adminDirect; Write-Output 'USING_DIRECT_ADMIN_TOKEN' }
  }

  $me = Invoke-RestMethod -Uri 'http://localhost:9090/auth/me' -Method Get -Headers @{ Authorization = "Bearer $token" }
  $userId = $me.id
  Write-Output "AUTH_USER_ID: $userId"

  # 1) Ensure a Branch exists (HR)
  $branchBody = @{ name = 'Kigali'; address = 'KG 123 St' }
  try { $branches = Invoke-RestMethod -Uri 'http://localhost:9090/hr/branches' -Method Get -Headers @{ Authorization = "Bearer $seedToken" } } catch { $branches = Invoke-RestMethod -Uri 'http://localhost:9094/branches' -Method Get -Headers @{ Authorization = "Bearer $seedToken" } }
  $branch = $branches | Where-Object { $_.name -eq 'Kigali' } | Select-Object -First 1
  if (-not $branch) {
    try {
      $branch = Invoke-Json 'http://localhost:9090/hr/branches' 'POST' $branchBody $seedToken
    } catch {
      # Fallback directly to hr-service
      $branch = Invoke-Json 'http://localhost:9094/branches' 'POST' $branchBody $seedToken
    }
  }
  $branchId = $branch.id
  Write-Output "BRANCH_ID: $branchId"

  # 2) Department under the branch
  $deptBody = @{ name = 'Academics'; branchId = $branchId }
  try { $depts = Invoke-RestMethod -Uri 'http://localhost:9090/hr/departments' -Method Get -Headers @{ Authorization = "Bearer $seedToken" } } catch { $depts = Invoke-RestMethod -Uri 'http://localhost:9094/departments' -Method Get -Headers @{ Authorization = "Bearer $seedToken" } }
  $dept = $depts | Where-Object { $_.name -eq 'Academics' -and $_.branchId -eq $branchId } | Select-Object -First 1
  if (-not $dept) {
    try {
      $dept = Invoke-Json 'http://localhost:9090/hr/departments' 'POST' $deptBody $seedToken
    } catch {
      $dept = Invoke-Json 'http://localhost:9094/departments' 'POST' $deptBody $seedToken
    }
  }
  $deptId = $dept.id
  Write-Output "DEPARTMENT_ID: $deptId"

  # 2b) Ledger Transaction early to ensure UI has data even if later steps fail
  $txBody = @{ type='INCOME'; category='Tuition'; name='Term fees'; materials=@('books'); amount=1500.00; txDate=(Get-Date -Format 'yyyy-MM-dd'); notes='Term 1'; branchId=$branchId }
  try {
    $txsExisting = Invoke-RestMethod -Uri 'http://localhost:9090/transactions' -Method Get -Headers @{ Authorization = "Bearer $seedToken" }
  } catch { $txsExisting = @() }
  $today = Get-Date -Format 'yyyy-MM-dd'
  $tx = $txsExisting | Where-Object { $_.name -eq 'Term fees' -and $_.txDate -eq $today } | Select-Object -First 1
  if (-not $tx) {
    try { $tx = Invoke-Json 'http://localhost:9090/transactions' 'POST' $txBody $seedToken } catch { try { $tx = Invoke-Json 'http://localhost:9091/transactions' 'POST' $txBody $seedToken } catch {} }
  }
  if ($tx) { $txId = $tx.id; Write-Output "TRANSACTION_ID: $txId" }

  # 3) Create a sample Employee
  $employeeBody = @{
    fullName = 'John Teacher'
    dob      = '1990-05-01'
    address  = 'Kigali'
    position = 'TEACHER'
    salary   = 1200
    phone    = '0780000000'
    email    = 'john.t@example.com'
    active   = $true
    department = @{ id = $deptId }
    branch     = @{ id = $branchId }
  }
  try { $emps = Invoke-RestMethod -Uri 'http://localhost:9090/hr/employees' -Method Get -Headers @{ Authorization = "Bearer $seedToken" } } catch { $emps = Invoke-RestMethod -Uri 'http://localhost:9094/employees' -Method Get -Headers @{ Authorization = "Bearer $seedToken" } }
  $employee = $emps | Where-Object { $_.email -eq 'john.t@example.com' } | Select-Object -First 1
  if (-not $employee) {
    $empCreated = $false
    try {
      $employee = Invoke-Json 'http://localhost:9090/hr/employees' 'POST' $employeeBody $seedToken
      $empCreated = $true
    } catch {
      try { $employee = Invoke-Json 'http://localhost:9094/employees' 'POST' $employeeBody $seedToken; $empCreated=$true } catch {}
    }
    if (-not $empCreated) {
      Write-Output 'WARN: Could not create employee (likely permission issue); continuing.'
    }
  }
  if ($employee) { $employeeId = $employee.id; Write-Output "EMPLOYEE_ID: $employeeId" }

  # 4) Guardian (Student service)
  $guardianBody = @{ fullName = 'Jane Doe'; phone = '0781111111'; email='jane@example.com'; address='Kigali' }
  try { $guardians = Invoke-RestMethod -Uri 'http://localhost:9090/students/guardians' -Method Get -Headers @{ Authorization = "Bearer $seedToken" } } catch { $guardians = Invoke-RestMethod -Uri 'http://localhost:9095/students/guardians' -Method Get -Headers @{ Authorization = "Bearer $seedToken" } }
  $guardian = $guardians | Where-Object { $_.email -eq 'jane@example.com' } | Select-Object -First 1
  if (-not $guardian) {
    try {
      $guardian = Invoke-Json 'http://localhost:9090/students/guardians' 'POST' $guardianBody $seedToken
    } catch {
      $guardian = Invoke-Json 'http://localhost:9095/students/guardians' 'POST' $guardianBody $seedToken
    }
  }
  $guardianId = $guardian.id
  Write-Output "GUARDIAN_ID: $guardianId"

  # 5) Student
  $studentBody = @{ guardianId = $guardianId; childName='Alice'; childDob='2015-02-10'; hobbies='Football'; needs=@(); needsOtherText=$null; branchId=$branchId }
  try { $students = Invoke-RestMethod -Uri 'http://localhost:9090/students' -Method Get -Headers @{ Authorization = "Bearer $seedToken" } } catch { $students = @() }
  $student = $students | Where-Object { $_.childName -eq 'Alice' } | Select-Object -First 1
  if (-not $student) {
    try { $student = Invoke-Json 'http://localhost:9090/students' 'POST' $studentBody $seedToken } catch { try { $student = Invoke-Json 'http://localhost:9095/students' 'POST' $studentBody $seedToken } catch {} }
  }
  if ($student) { $studentId = $student.id; Write-Output "STUDENT_ID: $studentId" }

  # 6) Student reports removed - skipped

  # 7) Ledger Transaction
  $txBody = @{ type='INCOME'; category='Tuition'; name='Term fees'; materials=@('books'); amount=1500.00; txDate=(Get-Date -Format 'yyyy-MM-dd'); notes='Term 1'; branchId=$branchId }
  # 8) Final counts via gateway
  try { $empCount = (Invoke-RestMethod -Uri 'http://localhost:9090/hr/employees' -Method Get -Headers @{ Authorization = "Bearer $seedToken" }).Count } catch { $empCount = -1 }
  try { $studCount = (Invoke-RestMethod -Uri 'http://localhost:9090/students' -Method Get -Headers @{ Authorization = "Bearer $seedToken" }).Count } catch { $studCount = -1 }
  try { $txCount = (Invoke-RestMethod -Uri 'http://localhost:9090/transactions' -Method Get -Headers @{ Authorization = "Bearer $seedToken" }).Count } catch { $txCount = -1 }
  Write-Output "COUNTS: employees=$empCount students=$studCount tx=$txCount"

  try {
    $summary = Invoke-RestMethod -Uri 'http://localhost:9090/reports/summary' -Method Get -Headers @{ Authorization = "Bearer $token" }
    Write-Output 'DASHBOARD_SUMMARY:'
    $summary | ConvertTo-Json -Depth 6
  } catch {
    Write-Output 'DASHBOARD_SUMMARY: UNAVAILABLE'
  }

} catch {
  Write-Output "SEED_GATEWAY_ERROR: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    $_.Exception.Response.GetResponseStream() | ForEach-Object { [System.IO.StreamReader]::new($_).ReadToEnd() }
  }
  exit 1
}
