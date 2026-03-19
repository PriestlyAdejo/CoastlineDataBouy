param(
  [switch]$SkipFrontend,
  [switch]$SkipBackend
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

Write-Host "== Nereus / Coastal Buoy: Windows bootstrap ==" -ForegroundColor Cyan
Write-Host "Repo: $PSScriptRoot\.." -ForegroundColor DarkGray

Assert-Command python "You must run this from an Anaconda Prompt (base) or ensure conda base python is on PATH."

$py = (python -c "import sys; print(sys.executable)")
$condaEnv = $env:CONDA_DEFAULT_ENV
Write-Host "Python: $py" -ForegroundColor Green
Write-Host "CONDA_DEFAULT_ENV: $condaEnv" -ForegroundColor Green
if ($condaEnv -ne "base") {
  Write-Host "WARNING: You asked to use conda env 'base' but CONDA_DEFAULT_ENV is '$condaEnv'." -ForegroundColor Yellow
  Write-Host "Open an Anaconda Prompt and run: conda activate base" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "-- Upgrading pip/setuptools/wheel (in current python) --" -ForegroundColor Cyan
python -m ensurepip --upgrade | Out-Null
python -m pip install --upgrade pip setuptools wheel

if (-not $SkipBackend) {
  Write-Host ""
  Write-Host "-- Installing backend (apps/api) editable + dev deps --" -ForegroundColor Cyan
  python -m pip install -e ".\apps\api[dev]"

  Write-Host ""
  Write-Host "-- Installing edge python package (edge/pi) editable (for shared libs/tests) --" -ForegroundColor Cyan
  python -m pip install -e ".\edge\pi[dev]"
}

if (-not $SkipFrontend) {
  Write-Host ""
  Write-Host "-- Checking Node/npm (frontend) --" -ForegroundColor Cyan

  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js not found on PATH." -ForegroundColor Red
    Write-Host "Install Node LTS from: https://nodejs.org/en/download" -ForegroundColor Yellow
    Write-Host "Then CLOSE Cursor terminals and reopen, and rerun this script." -ForegroundColor Yellow
    exit 3
  }
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "npm not found on PATH (node exists but npm missing)." -ForegroundColor Red
    Write-Host "Reinstall Node LTS (includes npm), then reopen terminal." -ForegroundColor Yellow
    exit 3
  }

  $nodeV = (node --version)
  $npmV = (npm --version)
  Write-Host "node: $nodeV  npm: $npmV" -ForegroundColor Green

  Write-Host ""
  Write-Host "-- Installing frontend deps (repo root) --" -ForegroundColor Cyan
  if (Test-Path ".\package-lock.json") {
    npm ci
  } else {
    npm install
  }
}

Write-Host ""
Write-Host "Bootstrap complete." -ForegroundColor Green
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "  - Backend: scripts\run_backend_windows.ps1" -ForegroundColor Cyan
Write-Host "  - Frontend: scripts\run_frontend_windows.ps1" -ForegroundColor Cyan

