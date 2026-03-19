@echo off
setlocal enabledelayedexpansion

REM Repo root is parent of the folder containing this script (script lives in scripts\).
cd /d "%~dp0.."
set "REPO_ROOT=%CD%"

echo.
echo === Nereus / Coastal Buoy: Windows bootstrap ===
echo Repo root: %REPO_ROOT%
echo.

REM --- Validate repo layout ---
if not exist "%REPO_ROOT%\apps\api\pyproject.toml" (
  echo ERROR: apps\api\pyproject.toml not found. Are you in the correct repo?
  echo Expected: %REPO_ROOT%\apps\api\pyproject.toml
  exit /b 1
)
if not exist "%REPO_ROOT%\package.json" (
  echo ERROR: package.json not found at repo root. Are you in the correct repo?
  exit /b 1
)
echo [OK] apps\api and package.json found.

if not exist "%REPO_ROOT%\.env.local" if exist "%REPO_ROOT%\.env.example" (
  copy "%REPO_ROOT%\.env.example" "%REPO_ROOT%\.env.local" >nul
  echo [OK] Created .env.local from .env.example for frontend API base URL.
)

REM --- Python ---
where python >nul 2>nul
if errorlevel 1 (
  echo.
  echo ERROR: python not found on PATH.
  echo Run from "Anaconda Prompt" or add Conda to PATH, then: conda activate base
  echo Or install Python and ensure it is on PATH.
  exit /b 2
)
for /f "usebackq delims=" %%i in (`python -c "import sys; print(sys.executable)" 2^>nul`) do set PYEXE=%%i
for /f "usebackq delims=" %%i in (`python -c "import sys; print(sys.version.split()[0])" 2^>nul`) do set PYVER=%%i
echo Python: !PYEXE!
echo Python version: !PYVER!
if defined CONDA_DEFAULT_ENV (echo Conda env: %CONDA_DEFAULT_ENV%) else (echo Conda env: not detected)
echo.

echo --- Upgrading pip, setuptools, wheel ---
python -m ensurepip --upgrade >nul 2>nul
python -m pip install --upgrade pip setuptools wheel
if errorlevel 1 (
  echo ERROR: pip upgrade failed. Check network and try again.
  exit /b 3
)

echo.
echo --- Installing backend (apps/api) editable + [dev] ---
set "API_PATH=%REPO_ROOT%\apps\api"
python -m pip install --no-build-isolation -e "%API_PATH%[dev]"
if errorlevel 1 (
  echo ERROR: backend install failed.
  echo Try from repo root: python -m pip install --no-build-isolation -e "%API_PATH%[dev]"
  exit /b 4
)
echo [OK] Backend install done.

echo.
echo --- Installing edge package (edge/pi) editable + [dev] ---
set "EDGE_PATH=%REPO_ROOT%\edge\pi"
python -m pip install --no-build-isolation -e "%EDGE_PATH%[dev]"
if errorlevel 1 (
  echo WARNING: edge install failed. Backend and frontend can still run.
)

echo.
echo --- Checking Node/npm (frontend) ---
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: node not found on PATH.
  echo Install Node.js LTS from: https://nodejs.org/en/download
  echo Then close and reopen your terminal, and rerun this script.
  exit /b 6
)
where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm not found on PATH.
  echo Reinstall Node.js LTS ^(includes npm^), then reopen terminal.
  exit /b 6
)
for /f "usebackq delims=" %%i in (`node --version 2^>nul`) do set NODEV=%%i
for /f "usebackq delims=" %%i in (`npm --version 2^>nul`) do set NPMV=%%i
echo node: !NODEV!  npm: !NPMV!
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
echo --- Backend import check ---
set "PYTHONPATH=%REPO_ROOT%\apps\api\src"
python -c "from nereus_api.main import app; print('backend import OK')"
if errorlevel 1 (
  echo WARNING: backend import check failed. Run backend and see errors.
) else (
  echo [OK] Backend import works.
)

echo.
echo === Bootstrap complete ===
echo.
echo Next steps:
echo   Backend:  scripts\run_backend_windows.bat   OR  scripts\run_backend_windows.ps1
echo   Frontend: scripts\run_frontend_windows.bat   OR  scripts\run_frontend_windows.ps1
echo   Both:     scripts\dev_windows.bat
echo.
exit /b 0
