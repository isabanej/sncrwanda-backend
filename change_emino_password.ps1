$ErrorActionPreference = 'Stop'

$newPassword = '123456'
$email = 'emino@example.com'
$usernameOrEmail = 'Emino'
$gateway = 'http://localhost:9090'

Write-Host "[1] Requesting password reset token via forgot-password..." -ForegroundColor Cyan
try {
  $forgotBody = @{ email = $email } | ConvertTo-Json
  Invoke-RestMethod -Uri "$gateway/auth/forgot-password" -Method Post -Body $forgotBody -ContentType 'application/json' | Out-Null
  Write-Host "Forgot-password accepted (202/202-style)." -ForegroundColor Green
} catch {
  Write-Host ("FAILED to request forgot-password: {0}" -f $_.Exception.Message) -ForegroundColor Red
  exit 1
}

Write-Host "[2] Waiting for reset token to appear in auth-service logs..." -ForegroundColor Cyan
$token = $null
$attempts = 0
while (-not $token -and $attempts -lt 15) {
  Start-Sleep -Seconds 1
  $attempts++
  $logs = docker logs deploy-auth-service-1 --since 20s 2>&1 | Select-String -Pattern 'PASSWORD_RESET token issued'
  if ($logs) {
    # Take the last match line
    $line = ($logs | Select-Object -Last 1).ToString()
    if ($line -match 'token=([A-Za-z0-9_-]+)') {
      $token = $matches[1]
    }
  }
}
if (-not $token) {
  Write-Host "No token found in logs; attempting DB fallback creation..." -ForegroundColor Yellow
  try {
    $rand = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([Guid]::NewGuid().ToString())).Replace('=','').Replace('+','-').Replace('/','_')
    $expiry = (Get-Date).AddMinutes(15).ToUniversalTime().ToString('yyyy-MM-dd HH:mm:ss')
    $sql = @"
DO $$
DECLARE
  u_id uuid;
BEGIN
  SELECT id INTO u_id FROM auth.users WHERE lower(username)='emino';
  IF u_id IS NULL THEN
    RAISE EXCEPTION 'User emino not found';
  END IF;
  DELETE FROM auth.password_reset_tokens WHERE user_id = u_id;
  INSERT INTO auth.password_reset_tokens(id, token, user_id, expires_at, used) VALUES (gen_random_uuid(), '$rand', u_id, '$expiry'::timestamp, false);
END $$ LANGUAGE plpgsql;
"@
    docker exec deploy-postgres-1 psql -U postgres -d sncrwanda -c "$sql" | Out-Null
    $token = $rand
    Write-Host "Generated fallback token via DB." -ForegroundColor Green
  } catch {
    Write-Host ("DB fallback failed: {0}" -f $_.Exception.Message) -ForegroundColor Red
    exit 1
  }
}
Write-Host "Extracted reset token: $token" -ForegroundColor Green

Write-Host "[3] Submitting reset-password with new password..." -ForegroundColor Cyan
try {
  $resetBody = @{ token = $token; newPassword = $newPassword } | ConvertTo-Json
  Invoke-RestMethod -Uri "$gateway/auth/reset-password" -Method Post -Body $resetBody -ContentType 'application/json'
  Write-Host "Password reset success." -ForegroundColor Green
} catch {
  Write-Host ("Reset failed: {0}" -f $_.Exception.Message) -ForegroundColor Red
  exit 1
}

Write-Host "[4] Verifying login with new password..." -ForegroundColor Cyan
try {
  $loginBody = @{ usernameOrEmail = $usernameOrEmail; password = $newPassword } | ConvertTo-Json
  $login = Invoke-RestMethod -Uri "$gateway/auth/login" -Method Post -Body $loginBody -ContentType 'application/json'
  $roles = ($login.user.roles -join ',')
  Write-Host "Login successful. Roles=$roles" -ForegroundColor Green
  Write-Host "TOKEN (truncated): " ($login.token.Substring(0,40) + '...') -ForegroundColor Yellow
} catch {
  Write-Host ("Login verification failed: {0}" -f $_.Exception.Message) -ForegroundColor Red
  exit 1
}

Write-Host "DONE: Password for '$usernameOrEmail' changed to $newPassword" -ForegroundColor Cyan
