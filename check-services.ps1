# Quick service status checker
Write-Host "`nChecking Backend Services Status...`n" -ForegroundColor Cyan

$services = @{
    9090 = "API Gateway"
    9092 = "Auth Service"
    9095 = "Student Service"
    9094 = "HR Service"
    9091 = "Ledger Service"
}

$allReady = $true

foreach($port in $services.Keys) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$port/health" -TimeoutSec 2 -ErrorAction Stop
        Write-Host "[OK] $($services[$port]) (Port $port)" -ForegroundColor Green
    } catch {
        Write-Host "[WAIT] $($services[$port]) (Port $port) - Still starting..." -ForegroundColor Yellow
        $allReady = $false
    }
}

Write-Host ""

if($allReady) {
    Write-Host "======================================" -ForegroundColor Green
    Write-Host "ALL SERVICES ARE READY!" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Login Credentials:" -ForegroundColor Cyan
    Write-Host "   Username: emino" -ForegroundColor White
    Write-Host "   Password: 123456" -ForegroundColor White
    Write-Host "   Role: SUPER_ADMIN" -ForegroundColor Green
    Write-Host ""
    Write-Host "Application URL: http://localhost:5173" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You can now log in!" -ForegroundColor Green
} else {
    Write-Host "Services are still starting..." -ForegroundColor Yellow
    Write-Host "   Wait a bit longer and run this script again:" -ForegroundColor White
    Write-Host "   .\check-services.ps1" -ForegroundColor Cyan
}

Write-Host ""
