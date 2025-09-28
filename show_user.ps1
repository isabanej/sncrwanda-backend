param(
  [Parameter(Mandatory=$true)][string]$Username,
  [Parameter(Mandatory=$true)][string]$Password
)

$ErrorActionPreference = 'Stop'

try {
  $loginBody = @{ usernameOrEmail = $Username; password = $Password } | ConvertTo-Json
  $login = Invoke-RestMethod -Uri 'http://localhost:9090/auth/login' -Method Post -Body $loginBody -ContentType 'application/json'
  $token = $login.token
  if (-not $token) { throw "No token for $Username" }
  $me = Invoke-RestMethod -Uri 'http://localhost:9090/auth/me' -Method Get -Headers @{ Authorization = "Bearer $token" }
  Write-Output ($me | ConvertTo-Json -Depth 6)
} catch {
  Write-Host ("SHOW_USER_ERROR: {0}" -f $_.Exception.Message) -ForegroundColor Red
  if ($_.Exception.Response) { $_.Exception.Response.GetResponseStream() | % { [System.IO.StreamReader]::new($_).ReadToEnd() } }
  exit 1
}
