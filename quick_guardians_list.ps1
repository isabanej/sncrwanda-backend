param(
  [string]$Username = 'emino',
  [string]$Password = '123456'
)

$ErrorActionPreference = 'Stop'

function Invoke-Json($uri, $method, $body, $token) {
  $headers = @{}
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  if ($null -ne $body -and ($body -isnot [string])) { $body = ($body | ConvertTo-Json -Depth 6) }
  return Invoke-RestMethod -Uri $uri -Method $method -Headers $headers -ContentType 'application/json' -Body $body
}

$login = Invoke-Json 'http://localhost:9090/auth/login' 'POST' @{ usernameOrEmail=$Username; password=$Password } $null
$token = $login.token
if (-not $token) { throw 'No token returned' }

$active = Invoke-Json 'http://localhost:9090/students/guardians' 'GET' $null $token
$arch   = Invoke-Json 'http://localhost:9090/students/guardians?archived=true' 'GET' $null $token

Write-Host ("ACTIVE_COUNT: {0}" -f (($active | Measure-Object).Count))
Write-Host ("ARCHIVED_COUNT: {0}" -f (($arch | Measure-Object).Count))

if (($active | Measure-Object).Count -gt 0) {
  $active | Select-Object -First 3 | ConvertTo-Json -Depth 5
} else {
  Write-Host 'No active guardians.'
}
