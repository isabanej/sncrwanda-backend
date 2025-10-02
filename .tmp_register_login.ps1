$ErrorActionPreference='Stop'
# Register via gateway then login to obtain a token and call /auth/admin/users
$reg = Get-Content -Raw 'c:\dev\sncrwanda-backend\temp_register.json' | ConvertFrom-Json
$body = @{ username = $reg.username; email = $reg.email; password = $reg.password } | ConvertTo-Json
try {
  Invoke-RestMethod -Uri 'http://localhost:9090/auth/register' -Method Post -Body $body -ContentType 'application/json' -ErrorAction Stop | Out-Null
  Write-Output 'REGISTER_OK'
} catch { Write-Output ('REGISTER_ERROR: ' + $_.Exception.Message) }
try {
  $loginBody = @{ usernameOrEmail = $reg.username; password = $reg.password } | ConvertTo-Json
  $login = Invoke-RestMethod -Uri 'http://localhost:9090/auth/login' -Method Post -Body $loginBody -ContentType 'application/json' -ErrorAction Stop
  $token = $login.token
  Write-Output ('LOGIN_OK TOKEN:' + $token)
} catch { Write-Output ('LOGIN_ERROR: ' + $_.Exception.Message); exit 0 }
try {
  $resp = Invoke-WebRequest -Uri 'http://localhost:9090/auth/admin/users' -Method Get -Headers @{ Authorization = ('Bearer ' + $token) } -UseBasicParsing -ErrorAction Stop
  Write-Output 'REQUEST_OK'
  Write-Output $resp.Content
} catch { Write-Output ('REQUEST_ERROR: ' + $_.Exception.Message); if ($_.Exception.Response) { $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); Write-Output $sr.ReadToEnd() } }
