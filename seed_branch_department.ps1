# Seed a default Branch and Department in HR so employees can be saved
$ErrorActionPreference = 'Stop'

function Invoke-Json($uri, $method, $body, $token) {
  $headers = @{}
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  if ($null -ne $body -and ($body -isnot [string])) { $body = ($body | ConvertTo-Json -Depth 8) }
  return Invoke-RestMethod -Uri $uri -Method $method -Headers $headers -ContentType 'application/json' -Body $body
}

try {
  # 1) Login (expects c:\dev\sncrwanda-backend\temp_login.json to exist). If it fails, register default admin then retry.
  $token = $null
  try {
    $loginBody = Get-Content -Raw 'c:\dev\sncrwanda-backend\temp_login.json'
    $login = Invoke-RestMethod -Uri 'http://localhost:9092/auth/login' -Method Post -Body $loginBody -ContentType 'application/json'
    Write-Output 'LOGIN_RESPONSE:'
    $login | ConvertTo-Json -Depth 6
    $token = $login.token
  } catch {
    Write-Output "LOGIN_FAILED: $($_.Exception.Message)"
    # Attempt register default admin then login with default creds
    try {
      $registerBody = @{ username = 'admin'; email = 'admin@example.com'; password = 'Secret123!' }
      try {
        $reg = Invoke-Json 'http://localhost:9092/auth/register' 'POST' $registerBody $null
        Write-Output 'REGISTER_RESPONSE:'
        $reg | ConvertTo-Json -Depth 6
      } catch {
        Write-Output "REGISTER_FAILED_OR_ALREADY_EXISTS: $($_.Exception.Message)"
      }
      $loginBody2 = @{ usernameOrEmail = 'admin'; password = 'Secret123!' } | ConvertTo-Json -Depth 5
      $login2 = Invoke-RestMethod -Uri 'http://localhost:9092/auth/login' -Method Post -Body $loginBody2 -ContentType 'application/json'
      Write-Output 'LOGIN_RESPONSE_RETRY:'
      $login2 | ConvertTo-Json -Depth 6
      $token = $login2.token
    } catch {
      throw "Unable to acquire authentication token. Aborting. Error: $($_.Exception.Message)"
    }
  }

  # 2) Create or fetch default Branch (Kigali)
  $branchName = 'Kigali'
  $branchBody = @{ name = $branchName; address = 'KG 123 St' }
  $branchId = $null
  try {
    $branch = Invoke-Json 'http://localhost:9094/branches' 'POST' $branchBody $token
    $branchId = $branch.id
    Write-Output "CREATED_BRANCH_ID: $branchId"
  } catch {
    $msg = $_.Exception.Message
    Write-Output "CREATE_BRANCH_ERROR_OR_EXISTS: $msg"
    # Fallback: list and find by name
    $allBranches = Invoke-Json 'http://localhost:9094/branches' 'GET' $null $token
    $existing = $allBranches | Where-Object { $_.name -eq $branchName } | Select-Object -First 1
    if ($existing -and $existing.id) {
      $branchId = $existing.id
      Write-Output "EXISTING_BRANCH_ID: $branchId"
    } else {
      throw "Branch '$branchName' not found after creation attempt."
    }
  }

  # 3) Create or fetch default Department (Academics) under the Branch
  $deptName = 'Academics'
  $deptBody = @{ name = $deptName; branchId = $branchId }
  $deptId = $null
  try {
    $dept = Invoke-Json 'http://localhost:9094/departments' 'POST' $deptBody $token
    $deptId = $dept.id
    Write-Output "CREATED_DEPARTMENT_ID: $deptId"
  } catch {
    $msg = $_.Exception.Message
    Write-Output "CREATE_DEPARTMENT_ERROR_OR_EXISTS: $msg"
    # Fallback: list and find by name + branch
    $allDepts = Invoke-Json 'http://localhost:9094/departments' 'GET' $null $token
    $existingD = $allDepts | Where-Object { $_.name -eq $deptName -and $_.branchId -eq $branchId } | Select-Object -First 1
    if ($existingD -and $existingD.id) {
      $deptId = $existingD.id
      Write-Output "EXISTING_DEPARTMENT_ID: $deptId"
    } else {
      throw "Department '$deptName' not found after creation attempt."
    }
  }

  Write-Output "DONE. Branch=$branchId Department=$deptId"

} catch {
  Write-Output "SEED_HR_BASICS_ERROR: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    $_.Exception.Response.GetResponseStream() | ForEach-Object { [System.IO.StreamReader]::new($_).ReadToEnd() }
  }
  exit 1
}
