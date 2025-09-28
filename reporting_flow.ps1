$ErrorActionPreference = 'Stop'
try {
  $loginBody = Get-Content -Raw 'c:\dev\sncrwanda-backend\temp_login.json'
  $login = Invoke-RestMethod -Uri 'http://localhost:9092/auth/login' -Method Post -Body $loginBody -ContentType 'application/json' -ErrorAction Stop
  Write-Output 'LOGIN_RESPONSE:'
  $login | ConvertTo-Json -Depth 5
  $token = $login.token
  Write-Output "TOKEN: $token"
  $summary = Invoke-RestMethod -Uri 'http://localhost:9096/reports/summary' -Method Get -Headers @{ Authorization = "Bearer $token" } -ErrorAction Stop
  Write-Output 'SUMMARY_RESPONSE:'
  $summary | ConvertTo-Json -Depth 5
} catch {
  Write-Output "ERROR: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    $_.Exception.Response.GetResponseStream() | % { [System.IO.StreamReader]::new($_).ReadToEnd() }
  }
}

