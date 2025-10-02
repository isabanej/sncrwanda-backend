$ErrorActionPreference = 'Stop'
cd 'c:\dev\sncrwanda-backend'
$loginBody = Get-Content -Raw 'temp_login.json'
try {
  $login = Invoke-RestMethod -Uri 'http://localhost:9090/auth/login' -Method Post -Body $loginBody -ContentType 'application/json' -ErrorAction Stop
  $token = $login.token
  Write-Output "TOKEN:$token"
  Set-Content -Path '.\.tmp_token.txt' -Value $token
} catch {
  Write-Output "LOGIN_ERROR: $($_.Exception.Message)"
  if ($_.Exception.Response) { $_.Exception.Response.GetResponseStream() | % { [System.IO.StreamReader]::new($_).ReadToEnd() } }
  exit 1
}