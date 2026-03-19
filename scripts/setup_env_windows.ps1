# MECH0073 Coastal Buoy: Conda env setup (buoy-dev).
# Run from any folder; repo root is derived from script location.
# If execution policy blocks: powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup_env_windows.ps1

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..")).Path
Set-Location $RepoRoot

Write-Host ""
Write-Host "=== MECH0073 Coastal Buoy: Conda env setup (buoy-dev) ===" -ForegroundColor Cyan
Write-Host "Repo root: $RepoRoot" -ForegroundColor DarkGray
Write-Host ""

if (-not (Test-Path (Join-Path $RepoRoot "environment.yml"))) {
  Write-Host "ERROR: environment.yml not found." -ForegroundColor Red
  exit 1
}
if (-not (Test-Path (Join-Path $RepoRoot "apps\api\pyproject.toml"))) {
  Write-Host "ERROR: apps\api\pyproject.toml not found." -ForegroundColor Red
  exit 1
}
if (-not (Test-Path (Join-Path $RepoRoot "package.json"))) {
  Write-Host "ERROR: package.json not found." -ForegroundColor Red
  exit 1
}
Write-Host "[OK] Repo layout verified." -ForegroundColor Green

if (-not (Get-Command conda -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: conda not found on PATH. Install Anaconda/Miniconda and run from Anaconda Prompt or add Conda to PATH." -ForegroundColor Red
  exit 2
}

$envExists = conda env list 2>$null | Select-String -Pattern "^\s*buoy-dev\s" -Quiet
if (-not $envExists) {
  Write-Host "Creating Conda env buoy-dev from environment.yml..." -ForegroundColor Cyan
  conda env create -f (Join-Path $RepoRoot "environment.yml")
  if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: conda env create failed." -ForegroundColor Red
    exit 3
  }
  Write-Host "[OK] Env buoy-dev created." -ForegroundColor Green
} else {
  Write-Host "Updating Conda env buoy-dev from environment.yml..." -ForegroundColor Cyan
  conda env update -f (Join-Path $RepoRoot "environment.yml") --prune
  if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: conda env update had issues. Continuing." -ForegroundColor Yellow
  } else {
    Write-Host "[OK] Env buoy-dev updated." -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "--- Installing backend and edge (editable) in buoy-dev ---" -ForegroundColor Cyan
conda run -n buoy-dev python -m pip install --upgrade pip setuptools wheel
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: pip upgrade failed." -ForegroundColor Red; exit 4 }

$apiPath = Join-Path $RepoRoot "apps\api"
conda run -n buoy-dev python -m pip install --no-build-isolation -e "${apiPath}[dev]"
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERROR: backend editable install failed." -ForegroundColor Red
  exit 5
}
Write-Host "[OK] Backend (apps/api) installed in buoy-dev." -ForegroundColor Green

$edgePath = Join-Path $RepoRoot "edge\pi"
conda run -n buoy-dev python -m pip install --no-build-isolation -e "${edgePath}[dev]"
if ($LASTEXITCODE -ne 0) {
  Write-Host "WARNING: edge editable install failed." -ForegroundColor Yellow
} else {
  Write-Host "[OK] Edge (edge/pi) installed in buoy-dev." -ForegroundColor Green
}

if (-not (Test-Path (Join-Path $RepoRoot ".env.local")) -and (Test-Path (Join-Path $RepoRoot ".env.example"))) {
  Copy-Item (Join-Path $RepoRoot ".env.example") (Join-Path $RepoRoot ".env.local")
  Write-Host "[OK] Created .env.local from .env.example." -ForegroundColor Green
}

Write-Host ""
Write-Host "--- Node/npm (frontend) ---" -ForegroundColor Cyan
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: node not found. Install Node.js LTS and reopen terminal." -ForegroundColor Red
  exit 6
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: npm not found. Reinstall Node.js LTS." -ForegroundColor Red
  exit 6
}
Write-Host "[OK] Node/npm found." -ForegroundColor Green

Write-Host ""
Write-Host "--- Installing frontend deps ---" -ForegroundColor Cyan
Set-Location $RepoRoot
if (Test-Path "package-lock.json") { npm ci } else { npm install }
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERROR: npm install failed." -ForegroundColor Red
  exit 7
}
Write-Host "[OK] Frontend deps installed." -ForegroundColor Green

Write-Host ""
Write-Host "--- Backend import check ---" -ForegroundColor Cyan
conda run -n buoy-dev python -c "from nereus_api.main import app; print('backend import OK')" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "WARNING: backend import check failed." -ForegroundColor Yellow
} else {
  Write-Host "[OK] Backend import works." -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Setup complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next: Select interpreter 'buoy-dev' in Cursor/VS Code (Ctrl+Shift+P > Python: Select Interpreter)." -ForegroundColor Cyan
Write-Host "  Backend:  scripts\run_backend_windows.bat" -ForegroundColor DarkGray
Write-Host "  Frontend: scripts\run_frontend_windows.bat" -ForegroundColor DarkGray
Write-Host "  Both:     scripts\dev_windows.bat" -ForegroundColor DarkGray
Write-Host ""
