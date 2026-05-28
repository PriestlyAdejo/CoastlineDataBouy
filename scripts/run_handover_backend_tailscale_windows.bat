@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0.."
set "REPO_ROOT=%CD%"

echo.
echo === Nereus Handover Backend (Tailscale) ===
echo Repo root: %REPO_ROOT%
echo.

if not exist "%REPO_ROOT%\apps\api\pyproject.toml" (
  echo ERROR: apps\api\pyproject.toml not found.
  exit /b 1
)

where docker >nul 2>nul
if errorlevel 1 (
  echo ERROR: docker not found on PATH.
  exit /b 2
)

where conda >nul 2>nul
if errorlevel 1 (
  echo ERROR: conda not found. Open Anaconda Prompt or add Conda to PATH.
  exit /b 3
)

conda env list | findstr "buoy-dev" >nul 2>nul
if errorlevel 1 (
  echo ERROR: Conda env "buoy-dev" not found. Run scripts\setup_env_windows.bat first.
  exit /b 4
)

echo Bringing up backend infrastructure containers...
docker compose -f "docker\compose.backend.yml" up -d
if errorlevel 1 (
  echo ERROR: failed to start backend docker infrastructure.
  exit /b 5
)

echo Running API migrations...
cd /d "%REPO_ROOT%\apps\api"
conda run -n buoy-dev python -m alembic -c alembic.ini upgrade head
if errorlevel 1 (
  echo ERROR: migration failed.
  exit /b 6
)
cd /d "%REPO_ROOT%"

set "PYTHONPATH=%REPO_ROOT%\apps\api\src"
if "%NEREUS_BUOY_UPLOAD_TOKEN%"=="" set NEREUS_BUOY_UPLOAD_TOKEN=STRONG_UPLOAD_TOKEN_69420
if "%NEREUS_API_PREFIX%"=="" set NEREUS_API_PREFIX=/v1

set HOST=0.0.0.0
set PORT=8000

echo.
echo API is starting for handover on %HOST%:%PORT%
echo Local API URL:               http://127.0.0.1:%PORT%/v1
echo Tailscale API URL:           http://^<LAPTOP_TAILSCALE_HOST_OR_IP^>:%PORT%/v1
echo FastAPI docs URL:            http://127.0.0.1:%PORT%/docs
echo Health URL:                  http://127.0.0.1:%PORT%/v1/healthz
echo Latest snapshot URL:         http://127.0.0.1:%PORT%/v1/nodes/ucl-buoy/snapshots/latest
echo.
echo IMPORTANT: If Pi cannot reach API over Tailscale, allow Python/Uvicorn through
echo Windows Firewall on Private/Tailscale network profiles.
echo.

conda run -n buoy-dev python -m uvicorn nereus_api.main:app --host %HOST% --port %PORT%
