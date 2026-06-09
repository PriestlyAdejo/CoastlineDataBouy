@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0.."
set "REPO_ROOT=%CD%"

echo.
echo === Nereus Handover Frontend ===
echo Repo root: %REPO_ROOT%
echo.

if not exist "%REPO_ROOT%\package.json" (
  echo ERROR: package.json not found.
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: node not found on PATH.
  exit /b 2
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm not found on PATH.
  exit /b 3
)

if not exist "%REPO_ROOT%\node_modules" (
  echo node_modules missing. Running npm install...
  cd /d "%REPO_ROOT%"
  npm install
  if errorlevel 1 (
    echo ERROR: npm install failed.
    exit /b 4
  )
)

set HOST=127.0.0.1
set PORT=5173
if "%VITE_API_BASE%"=="" set VITE_API_BASE=http://127.0.0.1:8000/v1

echo Starting dashboard on http://%HOST%:%PORT%
echo Dashboard API base in this shell: %VITE_API_BASE%
echo Handover URL:
echo http://%HOST%:%PORT%/?handover=1^&apiBase=http%%3A%%2F%%2F127.0.0.1%%3A8000%%2Fv1^&readable=1
echo Or run: scripts\open_handover_dashboard_windows.bat
echo.
echo Brighton Marina showcase URL:
echo http://%HOST%:%PORT%/?showcase=1^&mode=brighton^&readable=1
echo Or run: scripts\open_brighton_showcase_dashboard_windows.bat
echo.
cd /d "%REPO_ROOT%"
npm run dev -- --host %HOST% --port %PORT%
