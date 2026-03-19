param(
  [int]$Port = 5173
)

$ErrorActionPreference = "Stop"

function Assert-Command($name, $help) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "Missing required command: $name" -ForegroundColor Red
    Write-Host $help -ForegroundColor Yellow
    exit 2
  }
}

Assert-Command node "Install Node LTS from: https://nodejs.org/en/download (then reopen terminal)"
Assert-Command npm  "Install Node LTS from: https://nodejs.org/en/download (then reopen terminal)"

$nodeV = (node --version)
$npmV = (npm --version)
Write-Host "node: $nodeV  npm: $npmV" -ForegroundColor Green

if (-not (Test-Path ".\node_modules")) {
  Write-Host "node_modules missing; run scripts\bootstrap_windows.ps1 first." -ForegroundColor Yellow
}

Write-Host "Starting Vite dashboard. Expected URL: http://127.0.0.1:$Port" -ForegroundColor Cyan
npm run dev -- --host 127.0.0.1 --port $Port

