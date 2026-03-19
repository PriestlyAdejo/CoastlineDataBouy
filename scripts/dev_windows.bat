@echo off
REM Start backend + frontend in separate windows. Safe to run from anywhere (scripts or repo root).
cd /d "%~dp0.."
set "REPO_ROOT=%CD%"
set "SCRIPTS=%REPO_ROOT%\scripts"

echo.
echo Starting backend and frontend in new windows...
echo Repo root: %REPO_ROOT%
echo Backend:  http://127.0.0.1:8000/v1   (health: /v1/healthz, docs: /docs)
echo Frontend: http://127.0.0.1:5173
echo.

start "Nereus Backend" cmd /k ""%SCRIPTS%\run_backend_windows.bat""
start "Nereus Frontend" cmd /k ""%SCRIPTS%\run_frontend_windows.bat""
