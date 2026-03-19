# Run Vite frontend. Use: powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run_frontend_windows.ps1
param(
  [int]$Port = 5173
)

$ErrorActionPreference = "Stop"

# Repo root = parent of directory containing this script
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..")).Path
Set-Location $RepoRoot

Write-Host ""
Write-Host "=== Nereus Frontend (Vite) ===" -ForegroundColor Cyan
Write-Host "Repo root: $RepoRoot" -ForegroundColor DarkGray
Write-Host ""

if (-not (Test-Path (Join-Path $RepoRoot "package.json"))) {
  Write-Host "ERROR: package.json not found. Run from repo or scripts folder." -ForegroundColor Red
  exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: node not found on PATH. Install Node.js LTS from https://nodejs.org/en/download" -ForegroundColor Red
  exit 2
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: npm not found on PATH. Reinstall Node.js LTS." -ForegroundColor Red
  exit 2
}
$nodeV = (node --version 2>$null)
$npmV = (npm --version 2>$null)
Write-Host "node: $nodeV  npm: $npmV" -ForegroundColor Green

if (-not (Test-Path (Join-Path $RepoRoot "node_modules"))) {
  Write-Host "node_modules missing. Running npm install..." -ForegroundColor Yellow
  Set-Location $RepoRoot
  npm install
  if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed. Run bootstrap first: scripts\bootstrap_windows.ps1" -ForegroundColor Red
    exit 3
  }
}

Set-Location $RepoRoot
Write-Host ""
Write-Host "Starting Vite dashboard at http://127.0.0.1:$Port" -ForegroundColor Cyan
Write-Host ""
npm run dev -- --host 127.0.0.1 --port $Port
