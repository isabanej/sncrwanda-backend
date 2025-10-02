$ErrorActionPreference = 'Stop'
$body = '{"usernameOrEmail":"admin","password":"Secret123!"}'
Write-Output "Posting to http://localhost:9090/auth/login as admin"
try {
    $resp = Invoke-RestMethod -Method Post -Uri 'http://localhost:9090/auth/login' -Body $body -ContentType 'application/json'
    Write-Output "RESPONSE:"; $resp | ConvertTo-Json -Depth 5
} catch {
    Write-Output "REQUEST FAILED: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        try { $text = $_.Exception.Response.GetResponseStream() | ForEach-Object { new-object System.IO.StreamReader($_) } | ForEach-Object { $_.ReadToEnd() }; Write-Output "RESPONSE BODY:"; Write-Output $text } catch {}
    }
    exit 2
}
Write-Output "OK"