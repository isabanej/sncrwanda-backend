$ErrorActionPreference='Stop'
$loginBody = Get-Content -Raw 'c:\dev\sncrwanda-backend\temp_login.json'
try {
  $login = Invoke-RestMethod -Uri 'http://localhost:9090/auth/login' -Method Post -Body $loginBody -ContentType 'application/json'
  $token = $login.token
  Write-Output "LOGIN_OK"
  Write-Output "TOKEN:$token"
} catch {
  Write-Output "LOGIN_FAILED"
  Write-Output $_.Exception.Message
  exit 0
}
try {
  $resp = Invoke-WebRequest -Uri 'http://localhost:9090/auth/admin/users' -Method Get -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing -ErrorAction Stop
  Write-Output "REQUEST_OK"
  $resp.Content | Write-Output
} catch {
  Write-Output "REQUEST_FAILED"
  if ($_.Exception.Response) {
    $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Output $sr.ReadToEnd()
  } else {
    Write-Output $_.Exception.Message
  }
}
