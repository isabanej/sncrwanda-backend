$ErrorActionPreference = 'Stop'
Write-Host 'Logging in...'
$loginBody = Get-Content -Raw 'temp_login.json'
$login = Invoke-RestMethod -Uri 'http://localhost:9092/auth/login' -Method Post -Body $loginBody -ContentType 'application/json'
$token = $login.token
Write-Host "Token acquired: $($token.Substring(0,20))..."

function CallEndpoint($name, $url){
  Write-Host "--- $name ($url)" -ForegroundColor Cyan
  try {
    $res = Invoke-RestMethod -Uri $url -Headers @{ Authorization = "Bearer $token" }
    $json = $res | ConvertTo-Json -Depth 6
    if($json.Length -gt 400){ $json.Substring(0,400) + ' ...' } else { $json }
  } catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
      try { $sr = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream()); $body = $sr.ReadToEnd(); $sr.Dispose(); Write-Host $body } catch {}
    }
  }
}

CallEndpoint 'Students Select' 'http://localhost:9090/students/select'
CallEndpoint 'Teachers' 'http://localhost:9090/hr/teachers'
