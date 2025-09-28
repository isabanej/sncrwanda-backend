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

$txBody = Get-Content -Raw 'c:\dev\sncrwanda-backend\temp_tx.json'
try {
  $create = Invoke-RestMethod -Uri 'http://localhost:9091/transactions' -Method Post -Body $txBody -ContentType 'application/json' -Headers @{ Authorization = "Bearer $token" } -ErrorAction Stop
  Write-Output 'CREATE_RESPONSE:'
  $create | ConvertTo-Json -Depth 5
} catch {
  Write-Output "CREATE_ERROR: $($_.Exception.Message)"
  if ($_.Exception.Response) { $_.Exception.Response.GetResponseStream() | % { [System.IO.StreamReader]::new($_).ReadToEnd() } }
}

try {
  $list = Invoke-RestMethod -Uri 'http://localhost:9091/transactions' -Method Get -Headers @{ Authorization = "Bearer $token" } -ErrorAction Stop
  Write-Output 'LIST_RESPONSE:'
  $list | ConvertTo-Json -Depth 5
} catch {
  Write-Output "LIST_ERROR: $($_.Exception.Message)"
  if ($_.Exception.Response) { $_.Exception.Response.GetResponseStream() | % { [System.IO.StreamReader]::new($_).ReadToEnd() } }
}

