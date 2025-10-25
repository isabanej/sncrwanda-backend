# Optimized startup script for SNC Rwanda backend and frontend
# Starts all services in parallel for faster startup

param(
    [switch]$SkipBuild
)

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "STARTING SNC RWANDA SYSTEM" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan

# Stop any existing processes
Write-Host "`nStopping existing processes..." -ForegroundColor Yellow
Get-Process -Name "java","node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "   [OK] Clean slate ready" -ForegroundColor Green

# Start PostgreSQL database
Write-Host "`nStarting PostgreSQL database..." -ForegroundColor Yellow
Push-Location deploy
docker-compose up -d postgres | Out-Null
Pop-Location
Start-Sleep -Seconds 3
Write-Host "   [OK] Database running on port 5432" -ForegroundColor Green

Write-Host "`nStarting Backend Services..." -ForegroundColor Yellow
Write-Host "   (Running in parallel for faster startup)" -ForegroundColor Gray

# Start all backend services in parallel
$services = @(
    @{Name="Auth Service"; Path="auth-service"; Port=9092; Color="Yellow"},
    @{Name="API Gateway"; Path="api-gateway"; Port=9090; Color="Cyan"},
    @{Name="Student Service"; Path="student-service"; Port=9095; Color="Magenta"},
    @{Name="HR Service"; Path="hr-service"; Port=9094; Color="Blue"},
    @{Name="Ledger Service"; Path="ledger-service"; Port=8082; Color="Green"}
)

foreach($svc in $services) {
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "cd 'c:\dev\sncrwanda-backend\$($svc.Path)'; Write-Host '$($svc.Name.ToUpper()) - PORT $($svc.Port)' -ForegroundColor $($svc.Color); Write-Host '======================================' -ForegroundColor Cyan; mvn spring-boot:run"
    )
    
    Write-Host "   [OK] Started $($svc.Name) (Port $($svc.Port))" -ForegroundColor White
    Start-Sleep -Milliseconds 500
}

# Start frontend
Write-Host "`nStarting Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd 'c:\dev\sncrwanda-backend\frontend-new'; Write-Host 'REACT FRONTEND - PORT 5173' -ForegroundColor Cyan; Write-Host '======================================' -ForegroundColor Cyan; npm run dev"
)
Write-Host "   [OK] Started Frontend Dev Server (Port 5173)" -ForegroundColor White

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "ALL SERVICES STARTING!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan

Write-Host "`nSERVICES:" -ForegroundColor Yellow
Write-Host "   Auth Service     -> http://localhost:9092" -ForegroundColor White
Write-Host "   API Gateway      -> http://localhost:9090" -ForegroundColor White
Write-Host "   Student Service  -> http://localhost:9095" -ForegroundColor White
Write-Host "   HR Service       -> http://localhost:9094" -ForegroundColor White
Write-Host "   Ledger Service   -> http://localhost:8082" -ForegroundColor White
Write-Host "   Frontend         -> http://localhost:5173" -ForegroundColor Cyan

Write-Host "`nLOGIN CREDENTIALS:" -ForegroundColor Yellow
Write-Host "   Username: emino" -ForegroundColor White
Write-Host "   Password: 123456" -ForegroundColor White
Write-Host "   Role: SUPER_ADMIN" -ForegroundColor Green

Write-Host "`nSTARTUP INFO:" -ForegroundColor Yellow
Write-Host "   • Services starting in parallel (faster!)" -ForegroundColor White
Write-Host "   • First startup: ~30-60 seconds" -ForegroundColor White
Write-Host "   • Subsequent startups: ~15-30 seconds" -ForegroundColor White
Write-Host "   • Check terminal windows for progress" -ForegroundColor White

Write-Host "`nSTATUS CHECK:" -ForegroundColor Yellow
Write-Host "   Run: .\check-services.ps1" -ForegroundColor Cyan

Write-Host "`nREADY TO USE:" -ForegroundColor Yellow
Write-Host "   Wait for services, then go to: http://localhost:5173" -ForegroundColor Cyan

Write-Host "`n======================================`n" -ForegroundColor Cyan
