$ErrorActionPreference = 'SilentlyContinue'

function Hit($name, $url) {
  try {
    $res = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 3
    Write-Output ("{0}: OK" -f $name)
  } catch {
    Write-Output ("{0}: FAIL - {1}" -f $name, $_.Exception.Message)
  }
}

Hit 'Gateway' 'http://localhost:9090/actuator/health'
Hit 'Auth'    'http://localhost:9092/actuator/health'
Hit 'Ledger'  'http://localhost:9091/actuator/health'
Hit 'HR'      'http://localhost:9094/actuator/health'
Hit 'Student' 'http://localhost:9095/actuator/health'
Hit 'Report'  'http://localhost:9096/actuator/health'
