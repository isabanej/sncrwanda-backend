$ErrorActionPreference = 'Stop'

function Invoke-Json($url, $method, $body) {
  if ($null -ne $body -and ($body -isnot [string])) { $body = ($body | ConvertTo-Json -Depth 6) }
  return Invoke-RestMethod -Uri $url -Method $method -Body $body -ContentType 'application/json'
}

try {
  Write-Host 'Registering user emino with requested password...' -ForegroundColor Cyan
  $reg = @{ username='emino'; email='emino@example.com'; password='123456' }
  try { Invoke-Json 'http://localhost:9090/auth/register' 'POST' $reg | Out-Null } catch { Write-Host 'Register returned conflict or error; continuing...' -ForegroundColor Yellow }

  Write-Host 'Promoting emino to SUPER_ADMIN via Postgres...' -ForegroundColor Cyan
  # Copy SQL to container and execute with username variable
  $sqlPath = 'c:\dev\sncrwanda-backend\deploy\migrations\adhoc-promote-superadmin.sql'
  docker cp $sqlPath deploy-postgres-1:/tmp/adhoc-promote-superadmin.sql | Out-Null
  docker exec deploy-postgres-1 psql -U postgres -d sncrwanda -v username='emino' -f /tmp/adhoc-promote-superadmin.sql | Out-Null

  Write-Host 'Logging in as emino to verify roles...' -ForegroundColor Cyan
  $login = Invoke-Json 'http://localhost:9090/auth/login' 'POST' @{ usernameOrEmail='emino'; password='123456' }
  $token = $login.token
  if (-not $token) { throw 'No token returned for emino' }
  $me = Invoke-RestMethod -Uri 'http://localhost:9090/auth/me' -Method Get -Headers @{ Authorization = "Bearer $token" }
  Write-Output 'EMINO_DETAILS:'
  $me | ConvertTo-Json -Depth 6
  Write-Output 'CREDENTIALS:'
  Write-Output 'username: emino'
  Write-Output 'password: 123456'
} catch {
  Write-Host ("PROVISION_EMINO_ERROR: {0}" -f $_.Exception.Message) -ForegroundColor Red
  if ($_.Exception.Response) { $_.Exception.Response.GetResponseStream() | % { [System.IO.StreamReader]::new($_).ReadToEnd() } }
  exit 1
}
