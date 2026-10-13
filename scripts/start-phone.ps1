$ErrorActionPreference = 'Stop'

# Clear only the process holding Expo's fixed port, if a stale server exists.
$portLine = netstat -ano | Select-String ':8081\s+.*LISTENING'
if ($portLine) {
  $portOwner = ($portLine -replace '\s+', ' ').Trim().Split(' ')[-1]
  if ($portOwner -match '^\d+$') {
    Stop-Process -Id ([int]$portOwner) -Force -ErrorAction SilentlyContinue
  }
}

Start-Sleep -Milliseconds 500
npx.cmd expo start --go --lan --port 8081
