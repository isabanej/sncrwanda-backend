$ErrorActionPreference = 'Stop'

function Psql($sql) {
  docker exec deploy-postgres-1 psql -U postgres -d sncrwanda -c "$sql"
}

try {
  Write-Host 'Resetting user emino in database...' -ForegroundColor Cyan
  Psql "delete from auth.user_roles where user_id in (select id from auth.users where lower(username)='emino');"
  Psql "delete from auth.users where lower(username)='emino';"
  Write-Host 'Registering Emino via gateway...' -ForegroundColor Cyan
  $regBody = @{ username='Emino'; email='emino@example.com'; password='Secret123!' } | ConvertTo-Json
  Invoke-RestMethod -Uri 'http://localhost:9090/auth/register' -Method Post -Body $regBody -ContentType 'application/json' | Out-Null
  $loginBody = @{ usernameOrEmail='Emino'; password='Secret123!' } | ConvertTo-Json
  $login = Invoke-RestMethod -Uri 'http://localhost:9090/auth/login' -Method Post -Body $loginBody -ContentType 'application/json'
  $token = $login.token
  $me = Invoke-RestMethod -Uri 'http://localhost:9090/auth/me' -Headers @{ Authorization = "Bearer $token" }
  Write-Output 'EMINO_DETAILS:'
  $me | ConvertTo-Json -Depth 6
  Write-Output 'CREDENTIALS:'
  Write-Output 'username: Emino'
  Write-Output 'password: Secret123!'
} catch {
  Write-Host ("RESET_EMINO_ERROR: {0}" -f $_.Exception.Message) -ForegroundColor Red
  if ($_.Exception.Response) { $_.Exception.Response.GetResponseStream() | % { [System.IO.StreamReader]::new($_).ReadToEnd() } }
  exit 1
}
