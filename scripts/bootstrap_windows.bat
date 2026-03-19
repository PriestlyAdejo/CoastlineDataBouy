@echo off
setlocal enabledelayedexpansion

echo == Nereus / Coastal Buoy: Windows bootstrap ==
echo Repo: %~dp0\..

where python >nul 2>nul
if errorlevel 1 (
  echo.
  echo ERROR: python not found on PATH.
  echo Run from "Anaconda Prompt" after: conda activate base
  exit /b 2
)

for /f "usebackq delims=" %%i in (`python -c "import sys; print(sys.executable)"`) do set PYEXE=%%i
echo Python: %PYEXE%
echo CONDA_DEFAULT_ENV: %CONDA_DEFAULT_ENV%
if not "%CONDA_DEFAULT_ENV%"=="base" (
  echo WARNING: expected conda env 'base'. Current: %CONDA_DEFAULT_ENV%
  echo Open Anaconda Prompt and run: conda activate base
)

echo.
echo -- Upgrading pip/setuptools/wheel --
python -m ensurepip --upgrade >nul 2>nul
python -m pip install --upgrade pip setuptools wheel
if errorlevel 1 (
  echo ERROR: pip upgrade failed. Check network/proxy and try again.
  exit /b 3
)

echo.
echo -- Installing backend (apps/api) editable + dev deps --
python -m pip install -e ".\apps\api[dev]"
if errorlevel 1 (
  echo ERROR: backend install failed.
  exit /b 4
)

echo.
echo -- Installing edge python package (edge/pi) editable + dev deps --
python -m pip install -e ".\edge\pi[dev]"
if errorlevel 1 (
  echo ERROR: edge install failed.
  exit /b 5
)

echo.
echo -- Checking Node/npm (frontend) --
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: node not found on PATH.
  echo Install Node LTS from: https://nodejs.org/en/download
  echo Then reopen terminal and rerun this script.
  exit /b 6
)
where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm not found on PATH.
  echo Reinstall Node LTS (includes npm), then reopen terminal.
  exit /b 6
)

for /f "usebackq delims=" %%i in (`node --version`) do set NODEV=%%i
for /f "usebackq delims=" %%i in (`npm --version`) do set NPMV=%%i
echo node: %NODEV%  npm: %NPMV%

echo.
echo -- Installing frontend deps (repo root) --
if exist package-lock.json (
  npm ci
) else (
  npm install
)
if errorlevel 1 (
  echo ERROR: npm install failed.
  exit /b 7
)

echo.
echo Bootstrap complete.
echo Next:
echo   - Backend: scripts\run_backend_windows.bat
echo   - Frontend: scripts\run_frontend_windows.bat
exit /b 0

