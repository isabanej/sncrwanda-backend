$ErrorActionPreference = 'Stop'

try {
  # Register Emino (ignore if already exists)
  $regBody = @{ username='Emino'; email='emino@example.com'; password='Secret123!' } | ConvertTo-Json
  try {
    Invoke-RestMethod -Uri 'http://localhost:9090/auth/register' -Method Post -Body $regBody -ContentType 'application/json' -ErrorAction Stop | Out-Null
    Write-Host 'Registered user Emino' -ForegroundColor Green
  } catch {
    Write-Host 'User Emino may already exist (continuing)...' -ForegroundColor Yellow
  }

  # Login
  $loginBody = @{ usernameOrEmail='Emino'; password='Secret123!' } | ConvertTo-Json
  $login = Invoke-RestMethod -Uri 'http://localhost:9090/auth/login' -Method Post -Body $loginBody -ContentType 'application/json'
  $token = $login.token
  if (-not $token) { throw 'No token returned for Emino' }

  # Show /auth/me
  $me = Invoke-RestMethod -Uri 'http://localhost:9090/auth/me' -Method Get -Headers @{ Authorization = "Bearer $token" }
  Write-Output 'EMINO_DETAILS:'
  $me | ConvertTo-Json -Depth 6
  Write-Output 'CREDENTIALS:'
  Write-Output 'username: Emino'
  Write-Output 'password: Secret123!'
} catch {
  Write-Host ("EMINO_SETUP_ERROR: {0}" -f $_.Exception.Message) -ForegroundColor Red
  if ($_.Exception.Response) { $_.Exception.Response.GetResponseStream() | % { [System.IO.StreamReader]::new($_).ReadToEnd() } }
  exit 1
}
