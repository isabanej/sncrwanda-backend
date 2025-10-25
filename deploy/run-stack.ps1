<#
Run full stack using docker compose with helpful checks.

Usage examples:
# Basic run (build + up):
.
# From repository root: cd deploy; ./run-stack.ps1

# With options:
# ./run-stack.ps1 -ForceStopLocal -NoCache -Recreate

Parameters:
  -ForceStopLocal : attempts to stop local 'mvn' processes before starting compose (frees ports)
  -NoCache        : passes --no-cache to docker compose build
  -Recreate       : runs docker compose down --volumes --remove-orphans before building
#>
param(
    [switch]$ForceStopLocal,
    [switch]$NoCache,
    [switch]$Recreate,
    [switch]$Clean
)

Set-StrictMode -Version Latest

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Push-Location $scriptDir

Write-Host "[run-stack] running from: $scriptDir"

# Check docker availability
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker CLI not found in PATH. Please install Docker Desktop (https://www.docker.com/products/docker-desktop) and ensure 'docker' is on your PATH. Exiting."
    Pop-Location
    exit 1
}

if ($ForceStopLocal) {
    Write-Host "[run-stack] stopping local 'mvn' processes to free ports (if any)"
    $mvns = Get-Process mvn -ErrorAction SilentlyContinue
    if ($mvns) {
        $mvns | ForEach-Object {
            try { Stop-Process -Id $_.Id -Force -ErrorAction Stop; Write-Host "Stopped mvn PID=$($_.Id)" } catch { Write-Warning "Failed to stop mvn PID=$($_.Id): $_" }
        }
    } else {
        Write-Host "No 'mvn' processes found."
    }
}

# Optionally recreate (bring down) previous stack
if ($Recreate) {
    Write-Host "[run-stack] bringing down existing compose stack..."
    docker compose down --volumes --remove-orphans
}

# If user requests a deep clean, remove local images built by compose and volumes matching pgdata
if ($Clean) {
    Write-Host "[run-stack] performing clean: down --rmi local --volumes --remove-orphans"
    docker compose down --rmi local --volumes --remove-orphans

    # Attempt to remove any volumes that include 'pgdata' in their name (safe best-effort)
    try {
        $allVolumes = docker volume ls --format "{{.Name}}" 2>$null | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
        foreach ($v in $allVolumes) {
            if ($v -like '*pgdata*') {
                Write-Host "Removing volume: $v"
                docker volume rm $v | Out-Null
            }
        }
    } catch {
        Write-Warning "Failed to remove some volumes: $_"
    }

}

# Build images
$buildArgs = "docker compose build"
if ($NoCache) { $buildArgs += " --no-cache" }
Write-Host "[run-stack] building images: $buildArgs"
Invoke-Expression $buildArgs
if ($LASTEXITCODE -ne 0) {
    Write-Error "docker compose build failed (exit $LASTEXITCODE). Check output above."
    Pop-Location
    exit $LASTEXITCODE
}

# Start compose in detached mode
Write-Host "[run-stack] starting compose stack (detached)..."
docker compose up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Error "docker compose up failed (exit $LASTEXITCODE). Check Docker daemon or compose file."
    Pop-Location
    exit $LASTEXITCODE
}

# Show status
Write-Host "[run-stack] containers status:"
docker compose ps

# Show last 200 lines of logs for each service
$services = docker compose ps --services
foreach ($svc in $services) {
    Write-Host "`n===== logs for: $svc ====="
    docker compose logs --tail 200 $svc
}

# Quick actuator health checks (common service ports used in docker-compose)
$healthUrls = @(
    'http://localhost:9090/actuator/health', # api-gateway
    'http://localhost:9092/actuator/health', # auth-service
    'http://localhost:9095/actuator/health'  # student-service (example)
)

Write-Host "`n[run-stack] simple health checks:`n"
foreach ($u in $healthUrls) {
    try {
        $resp = Invoke-WebRequest -UseBasicParsing -Uri $u -TimeoutSec 5
        Write-Host "$u -> $($resp.StatusCode)"
    } catch {
        Write-Warning "$u -> unreachable"
    }
}

# Wait/poll helper: wait up to timeout for each health URL to return HTTP 200/204
function Wait-ForHealth {
    param(
        [string]$Url,
        [int]$TimeoutSec = 60,
        [int]$IntervalSec = 3
    )
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 5
            if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 300) {
                return $true
            }
        } catch { }
        Start-Sleep -Seconds $IntervalSec
    }
    return $false
}

Write-Host "`n[run-stack] waiting for services to become healthy (per actuator)..."
foreach ($u in $healthUrls) {
    $ok = Wait-ForHealth -Url $u -TimeoutSec 90 -IntervalSec 5
    if ($ok) { Write-Host "$u -> healthy" } else { Write-Warning "$u -> still unreachable after wait" }
}

Write-Host "`n[run-stack] done. To follow logs continuously run: docker compose logs -f"
Pop-Location
exit 0
