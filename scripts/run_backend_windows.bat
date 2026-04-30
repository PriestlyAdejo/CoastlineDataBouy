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
  echo ERROR: apps\api\pyproject.toml not found. Run from repo or scripts folder.
  exit /b 1
)

where conda >nul 2>nul
if errorlevel 1 (
  echo ERROR: conda not found. Open Anaconda Prompt or add Conda to PATH.
  echo Run scripts\setup_env_windows.bat first to create buoy-dev.
  exit /b 2
)
conda env list | findstr "buoy-dev" >nul 2>nul
if errorlevel 1 (
  echo ERROR: Conda env "buoy-dev" not found. Run: scripts\setup_env_windows.bat
  exit /b 2
)

set "PYTHONPATH=%REPO_ROOT%\apps\api\src"
if "%NEREUS_BUOY_UPLOAD_TOKEN%"=="" set NEREUS_BUOY_UPLOAD_TOKEN=STRONG_UPLOAD_TOKEN_69420
if "%NEREUS_API_PREFIX%"=="" set NEREUS_API_PREFIX=/v1

set HOST=127.0.0.1
set PORT=8000
echo Starting FastAPI at http://%HOST%:%PORT%/v1
echo Health: http://%HOST%:%PORT%/v1/healthz
echo Docs:   http://%HOST%:%PORT%/docs
echo.
conda run -n buoy-dev python -m uvicorn nereus_api.main:app --reload --host %HOST% --port %PORT%
