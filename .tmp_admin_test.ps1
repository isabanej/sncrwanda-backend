$ErrorActionPreference='Stop'
$body = @{ usernameOrEmail = 'admin'; password = 'Secret123!' } | ConvertTo-Json
try {
  $login = Invoke-RestMethod -Uri 'http://localhost:9090/auth/login' -Method Post -Body $body -ContentType 'application/json' -ErrorAction Stop
  Write-Output "LOGIN_OK"
  $token = $login.token
  Write-Output "TOKEN:$token"
} catch {
  Write-Output "LOGIN_FAILED"
  if ($_.Exception.Response) { $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); Write-Output $sr.ReadToEnd() }
  exit 1
}
try {
  $resp = Invoke-RestMethod -Uri 'http://localhost:9090/auth/admin/users' -Method Get -Headers @{ Authorization = "Bearer $token" } -ErrorAction Stop
  Write-Output "USERS_OK"
  $resp | ConvertTo-Json -Depth 6
} catch {
  Write-Output "USERS_FAILED"
  if ($_.Exception.Response) { $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); Write-Output $sr.ReadToEnd() } else { Write-Output $_.Exception.Message }
  exit 1
}