$connections = Get-NetTCPConnection -LocalPort 5050 -State Listen -ErrorAction SilentlyContinue
foreach ($connection in $connections) {
  Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
}

$tunnelProcesses = Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -match "localtunnel|lt --port|--port 5050|cloudflared.*tunnel"
}

foreach ($process in $tunnelProcesses) {
  Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
}

Write-Host "StreamBox online desligado nesta maquina."
