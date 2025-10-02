# Simple smoke test: login as admin (or register if needed) and GET /auth/admin/users via gateway
$ErrorActionPreference = 'Stop'
function Get-Token() {
  $login = @{ usernameOrEmail = 'admin'; password = 'Secret123!' } | ConvertTo-Json
  try { $r = Invoke-RestMethod -Uri 'http://localhost:9090/auth/login' -Method Post -Body $login -ContentType 'application/json'; return $r.token } catch {
    try { $reg = @{ username = 'admin'; email = 'admin@example.com'; password = 'Secret123!' } | ConvertTo-Json; Invoke-RestMethod -Uri 'http://localhost:9090/auth/register' -Method Post -Body $reg -ContentType 'application/json' } catch {}
    $r2 = Invoke-RestMethod -Uri 'http://localhost:9090/auth/login' -Method Post -Body $login -ContentType 'application/json'
    return $r2.token
  }
}
try {
  $token = Get-Token
  Write-Output "TOKEN_OK: ${token.Substring(0,[Math]::Min(40,$token.Length))}"
  $resp = Invoke-RestMethod -Uri 'http://localhost:9090/auth/admin/users' -Method Get -Headers @{ Authorization = "Bearer $token" }
  Write-Output "USERS_COUNT: $($resp.Count)"
  $resp | ConvertTo-Json -Depth 5
  exit 0
} catch {
  Write-Error "SMOKE_FAILED: $($_.Exception.Message)"
  if ($_.Exception.Response) { $_.Exception.Response.GetResponseStream() | ForEach-Object { [System.IO.StreamReader]::new($_).ReadToEnd() } }
  exit 2
}