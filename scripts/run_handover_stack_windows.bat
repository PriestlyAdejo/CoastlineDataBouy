@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0.."
set "REPO_ROOT=%CD%"

echo.
echo === Nereus Handover Stack Launcher ===
echo Repo root: %REPO_ROOT%
echo.

if not exist "%REPO_ROOT%\scripts\run_handover_backend_tailscale_windows.bat" (
  echo ERROR: handover backend script not found.
  exit /b 1
)

if not exist "%REPO_ROOT%\scripts\run_handover_frontend_windows.bat" (
  echo ERROR: handover frontend script not found.
  exit /b 2
)

echo Opening backend handover terminal...
start "Nereus Handover Backend" cmd /k "%REPO_ROOT%\scripts\run_handover_backend_tailscale_windows.bat"
timeout /t 3 >nul

echo Opening frontend handover terminal...
start "Nereus Handover Frontend" cmd /k "%REPO_ROOT%\scripts\run_handover_frontend_windows.bat"

echo.
echo Started backend + frontend handover terminals.
echo Then verify:
echo   curl http://127.0.0.1:8000/v1/healthz
echo   curl http://127.0.0.1:8000/v1/nodes/ucl-buoy/snapshots/latest
