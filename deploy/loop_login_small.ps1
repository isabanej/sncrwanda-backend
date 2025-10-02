$ErrorActionPreference = 'Continue'
$loginJsonPath = 'C:\dev\sncrwanda-backend\temp_login.json'
for ($i=1; $i -le 10; $i++) {
    try {
        $body = Get-Content -Raw -Path $loginJsonPath
        $resp = Invoke-RestMethod -Method Post -Uri 'http://localhost:9090/auth/login' -Body $body -ContentType 'application/json' -TimeoutSec 10
        Write-Output "OK $i"
    } catch {
        Write-Output "ERR $i $($_.Exception.Message)"
    }
    Start-Sleep -Milliseconds 200
}
Write-Output 'done'