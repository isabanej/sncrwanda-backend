$ErrorActionPreference = 'Stop'

function Invoke-Json($uri, $method, $body, $token) {
  $headers = @{}
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  if ($null -ne $body -and ($body -isnot [string])) { $body = ($body | ConvertTo-Json -Depth 8) }
  Write-Host "HTTP $method $uri" -ForegroundColor Cyan
  if ($body) { Write-Host "BODY: $body" -ForegroundColor DarkGray }
  try {
    return Invoke-RestMethod -Uri $uri -Method $method -Headers $headers -ContentType 'application/json' -Body $body
  } catch {
    Write-Host ("ERROR calling {0}: {1}" -f $uri, $_.Exception.Message) -ForegroundColor Red
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
      Write-Host 'ERROR DETAILS:' -ForegroundColor Yellow
      Write-Host $_.ErrorDetails.Message
    }
    if ($_.Exception.Response) {
      try {
        $respBody = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()).ReadToEnd()
        Write-Host 'RESPONSE BODY:' -ForegroundColor Yellow
        Write-Host $respBody
      } catch {}
    }
    throw
  }
}

function Get-Token($user, $pass) {
  $loginBody = @{ usernameOrEmail = $user; password = $pass }
  $resp = Invoke-Json 'http://localhost:9090/auth/login' 'POST' $loginBody $null
  return $resp.token
}

try {
  # Try SUPER_ADMIN first
  $user = 'emino'; $pass = '123456'
  $token = Get-Token $user $pass
  if (-not $token) { throw 'Failed to acquire token for emino' }
  Write-Host ("USER: {0}" -f $user)
  Write-Host ("TOKEN LEN: {0}" -f $token.Length)

  $month = (Get-Date).ToString('yyyy-MM')
  Write-Host "MONTH: $month"

  # List schedule for current month
  $listUrl = "http://localhost:9090/students/schedule?month=$month"
  $list = Invoke-Json $listUrl 'GET' $null $token
  Write-Host ("LIST_COUNT: {0}" -f (($list | Measure-Object).Count))

  # Seed demo items (fallback to admin if branch/role blocks seeding)
  $seedUrl = "http://localhost:9090/students/schedule/seed-demo?month=$month"
  try {
    $seeded = Invoke-Json $seedUrl 'POST' $null $token
  } catch {
    Write-Host 'Seed failed with current user, retrying as admin...' -ForegroundColor Yellow
    $user = 'admin'; $pass = 'Secret123!'; $token = Get-Token $user $pass
    if (-not $token) { throw 'Failed to acquire admin token' }
    $seeded = Invoke-Json $seedUrl 'POST' $null $token
  }
  Write-Host ("SEEDED_COUNT: {0}" -f (($seeded | Measure-Object).Count))

  # Create a specific class entry
  $createBody = @{
    month = $month
    weekIndex = 2
    dayOfWeek = 3
    title = 'Science Lab'
    timeText = '10 am-11 am'
    teacherName = 'Ms. Ada'
    imageUrl = 'https://images.unsplash.com/photo-1581092334607-35efc67b2b9b?q=80&w=200&h=200&fit=crop'
  }
  $created = Invoke-Json 'http://localhost:9090/students/schedule' 'POST' $createBody $token
  Write-Host ("CREATED_ID: {0}" -f $created.id)

  # List again to confirm
  $list2 = Invoke-Json $listUrl 'GET' $null $token
  Write-Host ("LIST2_COUNT: {0}" -f (($list2 | Measure-Object).Count))
} catch {
  Write-Host ("SCHEDULE_FLOW_ERROR: {0}" -f $_.Exception.Message) -ForegroundColor Red
  exit 1
}
