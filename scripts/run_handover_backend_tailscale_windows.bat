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

set "IN_BUOY_DEV=0"
if /i "%CONDA_DEFAULT_ENV%"=="buoy-dev" set "IN_BUOY_DEV=1"
if "%IN_BUOY_DEV%"=="0" (
  where python 2>nul | findstr /i "envs\\buoy-dev" >nul 2>nul
  if not errorlevel 1 set "IN_BUOY_DEV=1"
)
if "%IN_BUOY_DEV%"=="0" (
  echo WARNING: Active Python does not appear to be from buoy-dev.
  echo Activate buoy-dev first: conda activate buoy-dev
  echo.
)

where docker >nul 2>nul
if errorlevel 1 (
  echo ERROR: docker not found on PATH.
  exit /b 2
)

echo Bringing up backend infrastructure containers...
docker compose -f "docker\compose.backend.yml" up -d
if errorlevel 1 (
  echo ERROR: failed to start backend docker infrastructure.
  exit /b 5
)

echo.
echo Python environment:
where python
python --version
echo.

echo Running API migrations...
cd /d "%REPO_ROOT%\apps\api"
python -m alembic -c alembic.ini upgrade head
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
echo Tailscale API URL:           http://^<laptop-tailscale-ip^>:%PORT%/v1
echo Health URL:                  http://127.0.0.1:%PORT%/v1/healthz
echo Latest snapshot URL:         http://127.0.0.1:%PORT%/v1/nodes/ucl-buoy/snapshots/latest
echo Files URL:                   http://127.0.0.1:%PORT%/v1/files
echo Docs URL:                    http://127.0.0.1:%PORT%/docs
echo.
echo If the Pi cannot reach this API over Tailscale, allow Python/Uvicorn through Windows Firewall on private/Tailscale networks.
echo.

python -m uvicorn nereus_api.main:app --reload --host %HOST% --port %PORT%
