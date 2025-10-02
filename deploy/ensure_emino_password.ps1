# Ensure Emino's password is exactly 123456
# Uses internal debug endpoints exposed at /auth/_internal on the gateway (http://localhost:9090)
# Safe for local/dev only.

Param()
$base = 'http://localhost:9090/auth/_internal'
Write-Host "Checking current password for 'emino' via $base/login-simple..."
try {
    $uri = $base + '/login-simple'
    $body = "username=emino&password=123456"
    $r = Invoke-RestMethod -Method Post -Uri $uri -Body $body -ContentType 'application/x-www-form-urlencoded' -ErrorAction Stop
    Write-Host "Current response: $r"
    if ($r -match 'MATCH=true') {
        Write-Host "Password is already 123456. No change needed." -ForegroundColor Green
        exit 0
    }
    Write-Host "Password not 123456. Setting to 123456 now..." -ForegroundColor Yellow
    $uri2 = $base + '/set-password'
    $body2 = "username=emino&rawPassword=123456"
    Invoke-RestMethod -Method Post -Uri $uri2 -Body $body2 -ContentType 'application/x-www-form-urlencoded' -ErrorAction Stop
    Start-Sleep -Seconds 1
    $r2 = Invoke-RestMethod -Method Post -Uri $uri -Body $body -ContentType 'application/x-www-form-urlencoded' -ErrorAction Stop
    Write-Host "After set, response: $r2"
    if ($r2 -match 'MATCH=true') {
        Write-Host "Password updated successfully to 123456." -ForegroundColor Green
        exit 0
    } else {
        Write-Host "Failed to verify updated password." -ForegroundColor Red
        exit 2
    }
} catch {
    Write-Host "Error calling internal endpoints: $_" -ForegroundColor Red
    exit 3
}
