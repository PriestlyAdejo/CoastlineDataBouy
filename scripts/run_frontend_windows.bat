@echo off
setlocal enabledelayedexpansion

REM Repo root = parent of folder containing this script.
cd /d "%~dp0.."
set "REPO_ROOT=%CD%"

echo.
echo === Nereus Frontend (Vite) ===
echo Repo root: %REPO_ROOT%
echo.

if not exist "%REPO_ROOT%\package.json" (
  echo ERROR: package.json not found. Run from repo or scripts folder.
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: node not found on PATH.
  echo Install Node.js LTS from https://nodejs.org/en/download and reopen terminal.
  exit /b 2
)
where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm not found on PATH. Reinstall Node.js LTS.
  exit /b 2
)
for /f "usebackq delims=" %%i in (`node --version 2^>nul`) do set NODEV=%%i
for /f "usebackq delims=" %%i in (`npm --version 2^>nul`) do set NPMV=%%i
echo node: !NODEV!  npm: !NPMV!

if not exist "%REPO_ROOT%\node_modules" (
  echo node_modules missing. Running npm install...
  cd /d "%REPO_ROOT%"
  npm install
  if errorlevel 1 (
    echo ERROR: npm install failed. Run bootstrap first: scripts\bootstrap_windows.bat
    exit /b 3
  )
)

cd /d "%REPO_ROOT%"
set HOST=127.0.0.1
set PORT=5173
echo.
echo Starting Vite dashboard at http://%HOST%:%PORT%
echo.
npm run dev -- --host %HOST% --port %PORT%
