# PUT test: add BRANCH_ADMIN to trialuser2 then verify via GET
$ErrorActionPreference = 'Stop'
$targetUser = 'trialuser2'

function Get-Token {
  # Try several fallbacks to obtain a token via the gateway (robust for local dev)
  try {
    $login = @{ usernameOrEmail = 'admin'; password = 'Secret123!' } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri 'http://localhost:9090/auth/login' -Method Post -Body $login -ContentType 'application/json' -ErrorAction Stop
    return $r.token
  } catch {
    # Try to register admin if missing, ignore conflict
    try {
      $reg = @{ username = 'admin'; email = 'admin@example.com'; password = 'Secret123!' } | ConvertTo-Json
      Invoke-RestMethod -Uri 'http://localhost:9090/auth/register' -Method Post -Body $reg -ContentType 'application/json' -ErrorAction Stop | Out-Null
    } catch {}
    # Try login again
    try {
      $bodyJson = @{ usernameOrEmail='admin'; password='Secret123!' } | ConvertTo-Json
      $r2 = Invoke-RestMethod -Uri 'http://localhost:9090/auth/login' -Method Post -Body $bodyJson -ContentType 'application/json' -ErrorAction Stop
      return $r2.token
    } catch {
      # Last resort: attempt to login as 'emino' or other known user
      try {
        $bodyJson2 = @{ usernameOrEmail='emino'; password='Secret123!' } | ConvertTo-Json
        $r3 = Invoke-RestMethod -Uri 'http://localhost:9090/auth/login' -Method Post -Body $bodyJson2 -ContentType 'application/json' -ErrorAction Stop
        return $r3.token
      } catch {
        # Try direct login against auth-service as a fallback (bypass gateway)
        try {
          $bodyJson3 = @{ usernameOrEmail='admin'; password='Secret123!' } | ConvertTo-Json
          $r4 = Invoke-RestMethod -Uri 'http://localhost:9092/auth/login' -Method Post -Body $bodyJson3 -ContentType 'application/json' -ErrorAction Stop
          return $r4.token
        } catch {
          throw 'Unable to obtain token via gateway or direct auth-service'
        }
      }
    }
  }
}

$token = Get-Token
$users = Invoke-RestMethod -Uri 'http://localhost:9090/auth/admin/users' -Method Get -Headers @{ Authorization = "Bearer $token" }
$u = $users | Where-Object { $_.username -eq $targetUser } | Select-Object -First 1
if (-not $u) { Write-Error "User $targetUser not found"; exit 2 }
Write-Output "Found user $($u.username) id=$($u.id) roles=$(($u.roles -join ','))"
# add BRANCH_ADMIN if not present
$roles = @($u.roles) -as [System.Collections.ArrayList]
if (-not ($roles -contains 'BRANCH_ADMIN')) { $roles.Add('BRANCH_ADMIN') | Out-Null }
$body = @{ roles = $roles } | ConvertTo-Json
try {
  $updated = Invoke-RestMethod -Uri "http://localhost:9090/auth/admin/users/$($u.id)" -Method Put -Headers @{ Authorization = "Bearer $token" } -Body $body -ContentType 'application/json'
  Write-Output "Updated roles: $($updated.roles -join ',')"
  $verify = Invoke-RestMethod -Uri 'http://localhost:9090/auth/admin/users' -Method Get -Headers @{ Authorization = "Bearer $token" }
  $v = $verify | Where-Object { $_.id -eq $u.id }
  Write-Output "Verify roles: $($v.roles -join ',')"
} catch {
  Write-Error "PUT failed: $($_.Exception.Message)"
  if ($_.Exception.Response) { $_.Exception.Response.GetResponseStream() | ForEach-Object { [System.IO.StreamReader]::new($_).ReadToEnd() } }
  exit 2
}
exit 0
