$ErrorActionPreference = 'Stop'
$loginJsonPath = 'C:\dev\sncrwanda-backend\temp_login.json'
$body = Get-Content -Raw -Path $loginJsonPath
Write-Output "Posting to http://localhost:9090/auth/login with payload from $loginJsonPath"
try {
    $resp = Invoke-RestMethod -Method Post -Uri 'http://localhost:9090/auth/login' -Body $body -ContentType 'application/json'
    Write-Output "RESPONSE:"; $resp | ConvertTo-Json -Depth 5
} catch {
    Write-Output "REQUEST FAILED: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        try { $text = $_.Exception.Response.GetResponseStream() | %{ new-object System.IO.StreamReader($_) } | %{ $_.ReadToEnd() }; Write-Output "RESPONSE BODY:"; Write-Output $text } catch {}
    }
    exit 2
}

Write-Output "OK"
