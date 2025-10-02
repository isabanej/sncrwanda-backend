$ErrorActionPreference = 'Continue'
$loginJsonPath = 'C:\dev\sncrwanda-backend\temp_login.json'
$results = @()
for ($i=1; $i -le 100; $i++) {
    $time = Get-Date -Format o
    try {
        $body = Get-Content -Raw -Path $loginJsonPath
        $resp = Invoke-RestMethod -Method Post -Uri 'http://localhost:9090/auth/login' -Body $body -ContentType 'application/json' -TimeoutSec 10
        $results += [pscustomobject]@{index=$i; time=$time; status='OK'; code=200; resp=($resp | ConvertTo-Json -Depth 2)}
        Write-Output "OK $i"
    } catch {
        $msg = $_.Exception.Message
        $results += [pscustomobject]@{index=$i; time=$time; status='ERR'; code=($_.Exception.Response.StatusCode.Value__ -as [int]); resp=$msg}
        Write-Output "ERR $i $msg"
    }
    Start-Sleep -Milliseconds 100
}
# Save results
$results | ConvertTo-Json -Depth 5 | Out-File -FilePath 'C:\dev\sncrwanda-backend\deploy\loop_login_results.json' -Encoding utf8
Write-Output "Saved results to deploy\loop_login_results.json"