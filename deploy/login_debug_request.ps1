$ErrorActionPreference = 'Stop'
$body = '{"usernameOrEmail":"trialuser2","password":"Secret123!"}'
Write-Output "Posting to http://localhost:9090/auth/login (Invoke-WebRequest)"
try {
    $resp = Invoke-WebRequest -Method Post -Uri 'http://localhost:9090/auth/login' -Body $body -ContentType 'application/json' -UseBasicParsing -ErrorAction Stop
    Write-Output "STATUS: $($resp.StatusCode)"
    Write-Output "BODY:"; Write-Output $resp.Content
} catch {
    Write-Output "REQUEST FAILED: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        try { $rw = $_.Exception.Response; Write-Output "STATUS: $($rw.StatusCode)"; $text = $rw.GetResponseStream() | ForEach-Object { [System.IO.StreamReader]::new($_).ReadToEnd() }; Write-Output "BODY:"; Write-Output $text } catch {}
    }
    exit 2
}
Write-Output "OK"