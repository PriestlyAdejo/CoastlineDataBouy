@echo off
setlocal enabledelayedexpansion

REM Repo root = parent of folder containing this script.
cd /d "%~dp0.."
set "REPO_ROOT=%CD%"

echo.
echo === Nereus Backend (FastAPI) ===
echo Repo root: %REPO_ROOT%
echo.

if not exist "%REPO_ROOT%\apps\api\pyproject.toml" (
  echo ERROR: apps\api\pyproject.toml not found. Run this script from the repo or scripts folder.
  exit /b 1
)

where python >nul 2>nul
if errorlevel 1 (
  echo ERROR: python not found. Use Anaconda Prompt and: conda activate base
  exit /b 2
)
for /f "usebackq delims=" %%i in (`python -c "import sys; print(sys.executable)" 2^>nul`) do set PYEXE=%%i
echo Python: !PYEXE!

REM One-time install if uvicorn not available
python -c "import uvicorn" 2>nul
if errorlevel 1 (
  echo Backend deps missing. Installing once: pip install -e "%REPO_ROOT%\apps\api[dev]"
  python -m pip install --no-build-isolation -e "%REPO_ROOT%\apps\api[dev]"
  if errorlevel 1 (
    echo ERROR: Install failed. Run bootstrap first: scripts\bootstrap_windows.bat
    exit /b 3
  )
)

set "PYTHONPATH=%REPO_ROOT%\apps\api\src"
if "%NEREUS_BUOY_UPLOAD_TOKEN%"=="" set NEREUS_BUOY_UPLOAD_TOKEN=dev-token-change-me
if "%NEREUS_API_PREFIX%"=="" set NEREUS_API_PREFIX=/v1

set HOST=127.0.0.1
set PORT=8000
echo.
echo Starting FastAPI at http://%HOST%:%PORT%/v1
echo Health: http://%HOST%:%PORT%/v1/healthz
echo Docs:   http://%HOST%:%PORT%/docs
echo.
python -m uvicorn nereus_api.main:app --reload --host %HOST% --port %PORT%
