# Windows bootstrap: install backend + frontend deps. Use -NoProfile -ExecutionPolicy Bypass if needed.
param(
  [switch]$SkipFrontend,
  [switch]$SkipBackend
)

$ErrorActionPreference = "Stop"

# Repo root = parent of directory containing this script (script lives in scripts\)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..")).Path
Set-Location $RepoRoot

Write-Host ""
Write-Host "=== Nereus / Coastal Buoy: Windows bootstrap ===" -ForegroundColor Cyan
Write-Host "Repo root: $RepoRoot" -ForegroundColor DarkGray
Write-Host ""

# --- Validate repo layout ---
if (-not (Test-Path (Join-Path $RepoRoot "apps\api\pyproject.toml"))) {
  Write-Host "ERROR: apps\api\pyproject.toml not found. Are you in the correct repo?" -ForegroundColor Red
  Write-Host "Expected: $RepoRoot\apps\api\pyproject.toml" -ForegroundColor Red
  exit 1
}
if (-not (Test-Path (Join-Path $RepoRoot "package.json"))) {
  Write-Host "ERROR: package.json not found at repo root." -ForegroundColor Red
  exit 1
}
Write-Host "[OK] apps\api and package.json found." -ForegroundColor Green

if (-not (Test-Path (Join-Path $RepoRoot ".env.local")) -and (Test-Path (Join-Path $RepoRoot ".env.example"))) {
  Copy-Item (Join-Path $RepoRoot ".env.example") (Join-Path $RepoRoot ".env.local")
  Write-Host "[OK] Created .env.local from .env.example for frontend API base URL." -ForegroundColor Green
}

# --- Python ---
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  Write-Host ""
  Write-Host "ERROR: python not found on PATH." -ForegroundColor Red
  Write-Host "Run from Anaconda Prompt: conda activate base" -ForegroundColor Yellow
  Write-Host "Or install Python and ensure it is on PATH." -ForegroundColor Yellow
  exit 2
}
$pyExe = (python -c "import sys; print(sys.executable)" 2>$null)
$pyVer = (python -c "import sys; print(sys.version.split()[0])" 2>$null)
Write-Host "Python: $pyExe" -ForegroundColor Green
Write-Host "Python version: $pyVer" -ForegroundColor Green
if ($env:CONDA_DEFAULT_ENV) { Write-Host "Conda env: $env:CONDA_DEFAULT_ENV" -ForegroundColor Green }
Write-Host ""

Write-Host "--- Upgrading pip, setuptools, wheel ---" -ForegroundColor Cyan
python -m ensurepip --upgrade 2>$null | Out-Null
python -m pip install --upgrade pip setuptools wheel
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERROR: pip upgrade failed." -ForegroundColor Red
  exit 3
}

if (-not $SkipBackend) {
  Write-Host ""
  Write-Host "--- Installing backend (apps/api) editable + [dev] ---" -ForegroundColor Cyan
  $apiPath = Join-Path $RepoRoot "apps\api"
  python -m pip install --no-build-isolation -e "${apiPath}[dev]"
  if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: backend install failed." -ForegroundColor Red
    exit 4
  }
  Write-Host "[OK] Backend install done." -ForegroundColor Green

  Write-Host ""
  Write-Host "--- Installing edge package (edge/pi) editable + [dev] ---" -ForegroundColor Cyan
  $edgePath = Join-Path $RepoRoot "edge\pi"
  python -m pip install --no-build-isolation -e "${edgePath}[dev]"
  if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: edge install failed. Backend and frontend can still run." -ForegroundColor Yellow
  }
}

if (-not $SkipFrontend) {
  Write-Host ""
  Write-Host "--- Checking Node/npm (frontend) ---" -ForegroundColor Cyan
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: node not found on PATH." -ForegroundColor Red
    Write-Host "Install Node.js LTS from: https://nodejs.org/en/download" -ForegroundColor Yellow
    Write-Host "Then close and reopen your terminal and rerun this script." -ForegroundColor Yellow
    exit 6
  }
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: npm not found on PATH. Reinstall Node.js LTS." -ForegroundColor Red
    exit 6
  }
  $nodeV = (node --version 2>$null)
  $npmV = (npm --version 2>$null)
  Write-Host "node: $nodeV  npm: $npmV" -ForegroundColor Green
  Write-Host "[OK] Node/npm found." -ForegroundColor Green

  Write-Host ""
  Write-Host "--- Installing frontend deps (repo root) ---" -ForegroundColor Cyan
  Set-Location $RepoRoot
  if (Test-Path "package-lock.json") {
    npm ci
  } else {
    npm install
  }
  if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed." -ForegroundColor Red
    exit 7
  }
  Write-Host "[OK] Frontend deps installed." -ForegroundColor Green
}

if (-not $SkipBackend) {
  Write-Host ""
  Write-Host "--- Backend import check ---" -ForegroundColor Cyan
  $env:PYTHONPATH = Join-Path $RepoRoot "apps\api\src"
  python -c "from nereus_api.main import app; print('backend import OK')" 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: backend import check failed. Run backend and see errors." -ForegroundColor Yellow
  } else {
    Write-Host "[OK] Backend import works." -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "=== Bootstrap complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  Backend:  scripts\run_backend_windows.bat  OR  scripts\run_backend_windows.ps1"
Write-Host "  Frontend: scripts\run_frontend_windows.bat  OR  scripts\run_frontend_windows.ps1"
Write-Host "  Both:     scripts\dev_windows.bat"
Write-Host ""
