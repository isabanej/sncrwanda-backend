$ErrorActionPreference = 'Stop'
$loginBody = @{ usernameOrEmail = 'admin'; password = 'Secret123!' } | ConvertTo-Json
try {
  $login = Invoke-RestMethod -Uri 'http://localhost:9092/auth/login' -Method Post -Body $loginBody -ContentType 'application/json' -ErrorAction Stop
  $token = $login.token
  Write-Output ("LOGIN_OK TOKEN:$token")
} catch {
  Write-Output ("LOGIN_ERROR: " + $_.Exception.Message)
  exit 1
}
try {
  $resp = Invoke-RestMethod -Uri 'http://localhost:9090/auth/admin/users' -Method Get -Headers @{ Authorization = ("Bearer " + $token) } -ErrorAction Stop
  Write-Output 'REQUEST_OK'
  $resp | ConvertTo-Json -Depth 6
} catch {
  Write-Output ("REQUEST_ERROR: " + $_.Exception.Message)
  if ($_.Exception.Response) { $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); Write-Output $sr.ReadToEnd() }
}