#!/usr/bin/env pwsh
# Start ledger service from its own directory
Push-Location "c:\dev\sncrwanda-backend\ledger-service"
try {
    Write-Host "Starting ledger service from: $(Get-Location)"
    mvn spring-boot:run
} finally {
    Pop-Location
}
