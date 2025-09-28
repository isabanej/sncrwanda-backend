# Create a sample Employee referencing existing Branch and Department
$ErrorActionPreference = 'Stop'

function Invoke-Json($uri, $method, $body, $token) {
  $headers = @{}
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  if ($null -ne $body -and ($body -isnot [string])) { $body = ($body | ConvertTo-Json -Depth 12) }
  return Invoke-RestMethod -Uri $uri -Method $method -Headers $headers -ContentType 'application/json' -Body $body
}

try {
  # 1) Login or register default admin
  $token = $null
  try {
    $loginBody = Get-Content -Raw 'c:\dev\sncrwanda-backend\temp_login.json'
    $login = Invoke-RestMethod -Uri 'http://localhost:9092/auth/login' -Method Post -Body $loginBody -ContentType 'application/json'
    $token = $login.token
  } catch {
    Write-Output "LOGIN_FAILED: $($_.Exception.Message)"
    try {
      $registerBody = @{ username = 'admin'; email = 'admin@example.com'; password = 'Secret123!' }
      try { Invoke-Json 'http://localhost:9092/auth/register' 'POST' $registerBody $null | Out-Null } catch { Write-Output "REGISTER_FAILED_OR_EXISTS: $($_.Exception.Message)" }
      $loginBody2 = @{ usernameOrEmail = 'admin'; password = 'Secret123!' } | ConvertTo-Json -Depth 5
      $login2 = Invoke-RestMethod -Uri 'http://localhost:9092/auth/login' -Method Post -Body $loginBody2 -ContentType 'application/json'
      $token = $login2.token
    } catch { throw "Unable to authenticate: $($_.Exception.Message)" }
  }

  # 2) Lookup Branch and Department
  $branchName = 'Kigali'
  $deptName = 'Academics'
  $branches = Invoke-Json 'http://localhost:9094/branches' 'GET' $null $token
  $branch = $branches | Where-Object { $_.name -eq $branchName } | Select-Object -First 1
  if (-not $branch) { throw "Branch '$branchName' not found. Seed it first." }
  $departments = Invoke-Json 'http://localhost:9094/departments' 'GET' $null $token
  $dept = $departments | Where-Object { $_.name -eq $deptName -and $_.branchId -eq $branch.id } | Select-Object -First 1
  if (-not $dept) { throw "Department '$deptName' not found for branch '$branchName'. Seed it first." }

  # 3) Create Employee
  $empBody = @{
    fullName = 'Jane Doe'
    dob = '1990-01-01'
    address = '123 Main St'
    position = 'Teacher'
    salary = 50000.00
    phone = '+250788000000'
    email = 'jane.doe@example.com'
    startDate = (Get-Date -Format 'yyyy-MM-dd')
    endDate = $null
    department = @{ id = $dept.id }
    branch = @{ id = $branch.id }
  }

  $created = Invoke-Json 'http://localhost:9094/hr/employees' 'POST' $empBody $token
  Write-Output 'EMPLOYEE_CREATED:'
  $created | ConvertTo-Json -Depth 8

} catch {
  Write-Output "CREATE_EMPLOYEE_ERROR: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    $_.Exception.Response.GetResponseStream() | ForEach-Object { [System.IO.StreamReader]::new($_).ReadToEnd() }
  }
  exit 1
}
