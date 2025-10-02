param(
    [switch]$RebuildImages
)

Set-Location -Path $PSScriptRoot

if ($RebuildImages) {
    Write-Host "Rebuilding Docker images (this may take a while)..."
    docker compose build --no-cache
}

Write-Host "Starting docker-compose services in background..."
docker compose up -d

Write-Host "Waiting for Postgres to accept connections on localhost:5432..."
for ($i = 0; $i -lt 60; $i++) {
    $res = Test-NetConnection -ComputerName 'localhost' -Port 5432 -WarningAction SilentlyContinue
    if ($res -and $res.TcpTestSucceeded) {
        Write-Host "Postgres is accepting connections."
        break
    }
    Start-Sleep -Seconds 2
}

if ($i -eq 60) {
    Write-Host "Warning: Postgres did not become available within timeout. Check Docker status and logs: docker compose ps; docker compose logs postgres"
} else {
    Write-Host "Tailing auth-service logs (Ctrl-C to stop)."
}

docker compose logs -f auth-service
