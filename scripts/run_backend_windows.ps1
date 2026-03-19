param(
  [string]$HostAddr = "127.0.0.1",
  [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  Write-Host "python not found. Run from Anaconda Prompt with: conda activate base" -ForegroundColor Red
  exit 2
}

$py = (python -c "import sys; print(sys.executable)")
Write-Host "Python: $py" -ForegroundColor Green
Write-Host "CONDA_DEFAULT_ENV: $env:CONDA_DEFAULT_ENV" -ForegroundColor Green

# Ensure backend imports resolve even if editable install didn't run
$env:PYTHONPATH = (Join-Path $PSScriptRoot "..\apps\api\src")

# Local dev defaults (override by setting env vars before running script)
if (-not $env:NEREUS_BUOY_UPLOAD_TOKEN) { $env:NEREUS_BUOY_UPLOAD_TOKEN = "dev-token-change-me" }
if (-not $env:NEREUS_API_PREFIX) { $env:NEREUS_API_PREFIX = "/v1" }

Write-Host "Starting FastAPI on http://$HostAddr`:$Port/v1" -ForegroundColor Cyan
python -m uvicorn nereus_api.main:app --reload --host $HostAddr --port $Port

