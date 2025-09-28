$regBody = Get-Content -Raw 'c:\dev\sncrwanda-backend\temp_register.json'
try {
  $reg = Invoke-RestMethod -Uri 'http://localhost:9092/auth/register' -Method Post -Body $regBody -ContentType 'application/json' -ErrorAction Stop
  Write-Output 'REGISTER_RESPONSE:'
  $reg | ConvertTo-Json -Depth 5
} catch {
  Write-Output "REGISTER_ERROR: $($_.Exception.Message)"
  if ($_.Exception.Response) { $_.Exception.Response.GetResponseStream() | % { [System.IO.StreamReader]::new($_).ReadToEnd() } }
}

$loginBody = Get-Content -Raw 'c:\dev\sncrwanda-backend\temp_login.json'
try {
  $login = Invoke-RestMethod -Uri 'http://localhost:9092/auth/login' -Method Post -Body $loginBody -ContentType 'application/json' -ErrorAction Stop
  Write-Output 'LOGIN_RESPONSE:'
  $login | ConvertTo-Json -Depth 5
  $token = $login.token
  Write-Output "TOKEN: $token"
  try {
    $me = Invoke-RestMethod -Uri 'http://localhost:9092/auth/me' -Method Get -Headers @{ Authorization = "Bearer $token" } -ErrorAction Stop
    Write-Output 'ME_RESPONSE:'
    $me | ConvertTo-Json -Depth 5
  } catch {
    Write-Output "ME_ERROR: $($_.Exception.Message)"
    if ($_.Exception.Response) { $_.Exception.Response.GetResponseStream() | % { [System.IO.StreamReader]::new($_).ReadToEnd() } }
  }
} catch {
  Write-Output "LOGIN_ERROR: $($_.Exception.Message)"
  if ($_.Exception.Response) { $_.Exception.Response.GetResponseStream() | % { [System.IO.StreamReader]::new($_).ReadToEnd() } }
}

