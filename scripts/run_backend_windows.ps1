# Run FastAPI backend (uses Conda env buoy-dev).
# Use: powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run_backend_windows.ps1
param(
  [string]$HostAddr = "127.0.0.1",
  [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..")).Path
Set-Location $RepoRoot

Write-Host ""
Write-Host "=== Nereus Backend (FastAPI) ===" -ForegroundColor Cyan
Write-Host "Repo root: $RepoRoot" -ForegroundColor DarkGray
Write-Host ""

if (-not (Test-Path (Join-Path $RepoRoot "apps\api\pyproject.toml"))) {
  Write-Host "ERROR: apps\api\pyproject.toml not found." -ForegroundColor Red
  exit 1
}

if (-not (Get-Command conda -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: conda not found. Open Anaconda Prompt or run scripts\setup_env_windows.bat first." -ForegroundColor Red
  exit 2
}
$envList = conda env list 2>$null
if ($envList -notmatch "buoy-dev\s") {
  Write-Host "ERROR: Conda env 'buoy-dev' not found. Run: scripts\setup_env_windows.bat" -ForegroundColor Red
  exit 2
}

$env:PYTHONPATH = Join-Path $RepoRoot "apps\api\src"
if (-not $env:NEREUS_BUOY_UPLOAD_TOKEN) { $env:NEREUS_BUOY_UPLOAD_TOKEN = "dev-token-change-me" }
if (-not $env:NEREUS_API_PREFIX) { $env:NEREUS_API_PREFIX = "/v1" }

Write-Host "Starting FastAPI at http://${HostAddr}:$Port/v1" -ForegroundColor Cyan
Write-Host "Health: http://${HostAddr}:$Port/v1/healthz" -ForegroundColor DarkGray
Write-Host "Docs:   http://${HostAddr}:$Port/docs" -ForegroundColor DarkGray
Write-Host ""
conda run -n buoy-dev python -m uvicorn nereus_api.main:app --reload --host $HostAddr --port $Port
