# Run FastAPI backend. Use: powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run_backend_windows.ps1
param(
  [string]$HostAddr = "127.0.0.1",
  [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

# Repo root = parent of directory containing this script
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..")).Path
Set-Location $RepoRoot

Write-Host ""
Write-Host "=== Nereus Backend (FastAPI) ===" -ForegroundColor Cyan
Write-Host "Repo root: $RepoRoot" -ForegroundColor DarkGray
Write-Host ""

if (-not (Test-Path (Join-Path $RepoRoot "apps\api\pyproject.toml"))) {
  Write-Host "ERROR: apps\api\pyproject.toml not found. Run from repo or scripts folder." -ForegroundColor Red
  exit 1
}

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: python not found. Use Anaconda Prompt and: conda activate base" -ForegroundColor Red
  exit 2
}
$pyExe = (python -c "import sys; print(sys.executable)" 2>$null)
Write-Host "Python: $pyExe" -ForegroundColor Green

# One-time install if uvicorn not available
python -c "import uvicorn" 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Backend deps missing. Installing once..." -ForegroundColor Yellow
  $apiPath = Join-Path $RepoRoot "apps\api"
  python -m pip install --no-build-isolation -e "${apiPath}[dev]"
  if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Install failed. Run bootstrap first: scripts\bootstrap_windows.ps1" -ForegroundColor Red
    exit 3
  }
}

$env:PYTHONPATH = Join-Path $RepoRoot "apps\api\src"
if (-not $env:NEREUS_BUOY_UPLOAD_TOKEN) { $env:NEREUS_BUOY_UPLOAD_TOKEN = "dev-token-change-me" }
if (-not $env:NEREUS_API_PREFIX) { $env:NEREUS_API_PREFIX = "/v1" }

Write-Host ""
Write-Host "Starting FastAPI at http://${HostAddr}:$Port/v1" -ForegroundColor Cyan
Write-Host "Health: http://${HostAddr}:$Port/v1/healthz" -ForegroundColor DarkGray
Write-Host "Docs:   http://${HostAddr}:$Port/docs" -ForegroundColor DarkGray
Write-Host ""
python -m uvicorn nereus_api.main:app --reload --host $HostAddr --port $Port
