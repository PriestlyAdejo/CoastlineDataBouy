@echo off
setlocal enabledelayedexpansion

REM Repo root = parent of folder containing this script.
cd /d "%~dp0.."
set "REPO_ROOT=%CD%"

echo.
echo === MECH0073 Coastal Buoy: Conda env setup (buoy-dev) ===
echo Repo root: %REPO_ROOT%
echo.

REM --- Validate repo layout ---
if not exist "%REPO_ROOT%\environment.yml" (
  echo ERROR: environment.yml not found. Are you in the correct repo?
  exit /b 1
)
if not exist "%REPO_ROOT%\apps\api\pyproject.toml" (
  echo ERROR: apps\api\pyproject.toml not found.
  exit /b 1
)
if not exist "%REPO_ROOT%\package.json" (
  echo ERROR: package.json not found at repo root.
  exit /b 1
)
echo [OK] Repo layout verified.

REM --- Conda ---
where conda >nul 2>nul
if errorlevel 1 (
  echo ERROR: conda not found on PATH.
  echo Install Anaconda or Miniconda, then open "Anaconda Prompt" and run this script again.
  echo Or add Conda to PATH and ensure "conda" is available in this terminal.
  exit /b 2
)

REM Create or update env from environment.yml
conda env list | findstr /b "buoy-dev" >nul 2>nul
if errorlevel 1 (
  echo Creating Conda env "buoy-dev" from environment.yml...
  conda env create -f "%REPO_ROOT%\environment.yml"
  if errorlevel 1 (
    echo ERROR: conda env create failed.
    exit /b 3
  )
  echo [OK] Env buoy-dev created.
) else (
  echo Updating Conda env "buoy-dev" from environment.yml...
  conda env update -f "%REPO_ROOT%\environment.yml" --prune
  if errorlevel 1 (
    echo WARNING: conda env update had issues. Continuing with pip installs.
  ) else (
    echo [OK] Env buoy-dev updated.
  )
)

REM Pip: upgrade tools and editable installs (run inside buoy-dev)
echo.
echo --- Installing backend and edge packages (editable) in buoy-dev ---
conda run -n buoy-dev python -m pip install --upgrade pip setuptools wheel
if errorlevel 1 (
  echo ERROR: pip upgrade failed.
  exit /b 4
)

set "API_PATH=%REPO_ROOT%\apps\api"
conda run -n buoy-dev python -m pip install --no-build-isolation -e "%API_PATH%[dev]"
if errorlevel 1 (
  echo ERROR: backend editable install failed.
  exit /b 5
)
echo [OK] Backend (apps/api) installed in buoy-dev.

set "EDGE_PATH=%REPO_ROOT%\edge\pi"
conda run -n buoy-dev python -m pip install --no-build-isolation -e "%EDGE_PATH%[dev]"
if errorlevel 1 (
  echo WARNING: edge editable install failed. Backend and frontend can still run.
) else (
  echo [OK] Edge (edge/pi) installed in buoy-dev.
)

REM Frontend .env.local from example if missing
if not exist "%REPO_ROOT%\.env.local" if exist "%REPO_ROOT%\.env.example" (
  copy "%REPO_ROOT%\.env.example" "%REPO_ROOT%\.env.local" >nul
  echo [OK] Created .env.local from .env.example.
)

REM --- Node/npm (frontend) ---
echo.
echo --- Checking Node/npm (frontend) ---
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: node not found on PATH.
  echo Install Node.js LTS from https://nodejs.org/en/download then reopen terminal and rerun.
  exit /b 6
)
where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm not found on PATH. Reinstall Node.js LTS.
  exit /b 6
)
echo [OK] Node/npm found.

echo.
echo --- Installing frontend deps (repo root) ---
cd /d "%REPO_ROOT%"
if exist package-lock.json (
  npm ci
) else (
  npm install
)
if errorlevel 1 (
  echo ERROR: npm install failed.
  exit /b 7
)
echo [OK] Frontend deps installed.

echo.
echo --- Backend import check (buoy-dev) ---
conda run -n buoy-dev python -c "from nereus_api.main import app; print('backend import OK')" 2>nul
if errorlevel 1 (
  echo WARNING: backend import check failed. Run backend and see errors.
) else (
  echo [OK] Backend import works.
)

echo.
echo === Setup complete ===
echo.
echo Next: select interpreter "buoy-dev" in Cursor/VS Code (Ctrl+Shift+P ^> Python: Select Interpreter).
echo Then run:
echo   Backend:  scripts\run_backend_windows.bat
echo   Frontend: scripts\run_frontend_windows.bat
echo   Both:     scripts\dev_windows.bat
echo.
exit /b 0
