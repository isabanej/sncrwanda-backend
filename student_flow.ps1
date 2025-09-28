$loginBody = Get-Content -Raw 'c:\dev\sncrwanda-backend\temp_login.json'
try {
  $login = Invoke-RestMethod -Uri 'http://localhost:9092/auth/login' -Method Post -Body $loginBody -ContentType 'application/json' -ErrorAction Stop
  Write-Output 'LOGIN_RESPONSE:'
  $login | ConvertTo-Json -Depth 5
} catch {
  Write-Output "LOGIN_ERROR: $($_.Exception.Message)"
  if ($_.Exception.Response) { $_.Exception.Response.GetResponseStream() | % { [System.IO.StreamReader]::new($_).ReadToEnd() } }
  exit 1
}
$token = $login.token
Write-Output "TOKEN: $token"

# Create guardian
$guardianBody = Get-Content -Raw 'c:\dev\sncrwanda-backend\temp_guardian.json'
try {
  $createdGuardian = Invoke-RestMethod -Uri 'http://localhost:9095/students/guardians' -Method Post -Body $guardianBody -ContentType 'application/json' -Headers @{ Authorization = "Bearer $token" } -ErrorAction Stop
  Write-Output 'GUARDIAN_CREATED:'
  $createdGuardian | ConvertTo-Json -Depth 5
} catch {
  Write-Output "GUARDIAN_CREATE_ERROR: $($_.Exception.Message)"
  if ($_.Exception.Response) { $_.Exception.Response.GetResponseStream() | % { [System.IO.StreamReader]::new($_).ReadToEnd() } }
  exit 1
}

$guardianId = $createdGuardian.id
Write-Output "GUARDIAN_ID: $guardianId"

# Build student JSON
$student = @{
  guardianId = $guardianId
  childName = 'Little Tim'
  childDob = '2019-06-15'
  hobbies = 'drawing'
  needs = @()
  needsOtherText = $null
  orgId = '00000000-0000-0000-0000-000000000001'
}
$studentJson = ($student | ConvertTo-Json -Depth 5)
Write-Output "STUDENT_JSON: $studentJson"

# Create student
try {
  $createdStudent = Invoke-RestMethod -Uri 'http://localhost:9095/students' -Method Post -Body $studentJson -ContentType 'application/json' -Headers @{ Authorization = "Bearer $token" } -ErrorAction Stop
  Write-Output 'STUDENT_CREATED:'
  $createdStudent | ConvertTo-Json -Depth 5
} catch {
  Write-Output "STUDENT_CREATE_ERROR: $($_.Exception.Message)"
  if ($_.Exception.Response) { $_.Exception.Response.GetResponseStream() | % { [System.IO.StreamReader]::new($_).ReadToEnd() } }
  exit 1
}

# List students
try {
  $list = Invoke-RestMethod -Uri 'http://localhost:9095/students' -Method Get -Headers @{ Authorization = "Bearer $token" } -ErrorAction Stop
  Write-Output 'LIST_RESPONSE:'
  $list | ConvertTo-Json -Depth 5
} catch {
  Write-Output "LIST_ERROR: $($_.Exception.Message)"
  if ($_.Exception.Response) { $_.Exception.Response.GetResponseStream() | % { [System.IO.StreamReader]::new($_).ReadToEnd() } }
}

