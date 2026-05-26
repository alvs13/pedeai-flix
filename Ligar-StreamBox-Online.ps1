$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$node = "C:\Program Files\nodejs\node.exe"
$npm = "C:\Program Files\nodejs\npm.cmd"
$cloudflared = Join-Path $env:TEMP "cloudflared.exe"
$backendLog = Join-Path $backend "streambox-backend.log"
$tunnelOut = Join-Path $backend "localtunnel-output.log"
$tunnelErr = Join-Path $backend "localtunnel-error.log"
$cloudflaredOut = Join-Path $backend "cloudflared-output.log"
$cloudflaredErr = Join-Path $backend "cloudflared-error.log"

function Test-PortOpen($port) {
  $connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  return $null -ne $connection
}

if (-not (Test-PortOpen 5050)) {
  Start-Process -FilePath $node -ArgumentList @("src/server.js") -WorkingDirectory $backend -RedirectStandardOutput $backendLog -RedirectStandardError $backendLog -WindowStyle Hidden
  Start-Sleep -Seconds 2
}

if (-not (Test-Path $cloudflared)) {
  Write-Host "Baixando Cloudflare Tunnel..."
  curl.exe -L "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -o $cloudflared
}

if (Test-Path $cloudflaredOut) { Remove-Item -LiteralPath $cloudflaredOut -Force }
if (Test-Path $cloudflaredErr) { Remove-Item -LiteralPath $cloudflaredErr -Force }

Start-Process -FilePath $cloudflared -ArgumentList @("tunnel","--url","http://localhost:5050") -WorkingDirectory $backend -RedirectStandardOutput $cloudflaredOut -RedirectStandardError $cloudflaredErr -WindowStyle Hidden

$url = $null
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Seconds 1
  if (Test-Path $cloudflaredErr) {
    $line = Get-Content $cloudflaredErr -ErrorAction SilentlyContinue | Select-String -Pattern "https://.*\.trycloudflare\.com" | Select-Object -Last 1
    if ($line) {
      $url = [regex]::Match($line.ToString(), "https://\S+").Value
      break
    }
  }
}

if (-not $url) {
  Write-Host "Nao consegui obter a URL online. Veja backend/cloudflared-error.log"
  exit 1
}

Write-Host ""
Write-Host "StreamBox online nesta maquina:"
Write-Host "Admin: $url"
Write-Host "App:   $url/app"
Write-Host ""
Write-Host "Importante: esta URL funciona enquanto este PC estiver ligado, com internet, e estes processos rodando."
