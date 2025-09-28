$loginBody = Get-Content -Raw 'c:\dev\sncrwanda-backend\temp_login_trial.json'
try {
  # Use API Gateway for auth to align with frontend routes
  $login = Invoke-RestMethod -Uri 'http://localhost:9090/auth/login' -Method Post -Body $loginBody -ContentType 'application/json' -ErrorAction Stop
  Write-Output 'LOGIN_RESPONSE:'
  $login | ConvertTo-Json -Depth 5
} catch {
  Write-Output "LOGIN_ERROR: $($_.Exception.Message)"
  if ($_.Exception.Response) { $_.Exception.Response.GetResponseStream() | % { [System.IO.StreamReader]::new($_).ReadToEnd() } }
  exit 1
}
$token = $login.token
Write-Output "TOKEN: $token"

$empBody = Get-Content -Raw 'c:\dev\sncrwanda-backend\temp_employee_gateway.json'
try {
  # Create via API Gateway which routes /hr/* to hr-service
  $create = Invoke-RestMethod -Uri 'http://localhost:9090/hr/employees' -Method Post -Body $empBody -ContentType 'application/json' -Headers @{ Authorization = "Bearer $token" } -ErrorAction Stop
  Write-Output 'CREATE_RESPONSE:'
  $create | ConvertTo-Json -Depth 5
} catch {
  Write-Output "CREATE_ERROR: $($_.Exception.Message)"
  if ($_.Exception.Response) { $_.Exception.Response.GetResponseStream() | % { [System.IO.StreamReader]::new($_).ReadToEnd() } }
}

try {
  $list = Invoke-RestMethod -Uri 'http://localhost:9090/hr/employees' -Method Get -Headers @{ Authorization = "Bearer $token" } -ErrorAction Stop
  Write-Output 'LIST_RESPONSE:'
  $list | ConvertTo-Json -Depth 5
} catch {
  Write-Output "LIST_ERROR: $($_.Exception.Message)"
  if ($_.Exception.Response) { $_.Exception.Response.GetResponseStream() | % { [System.IO.StreamReader]::new($_).ReadToEnd() } }
}

