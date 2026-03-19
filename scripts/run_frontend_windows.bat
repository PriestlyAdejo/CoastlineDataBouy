@echo off
setlocal

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: node not found on PATH.
  echo Install Node LTS from: https://nodejs.org/en/download
  echo Then reopen terminal and rerun.
  exit /b 2
)
where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm not found on PATH.
  echo Install Node LTS from: https://nodejs.org/en/download
  echo Then reopen terminal and rerun.
  exit /b 2
)

if not exist node_modules (
  echo WARNING: node_modules missing; run scripts\bootstrap_windows.bat first.
)

set HOST=127.0.0.1
set PORT=5173
echo Starting Vite dashboard. Expected URL: http://%HOST%:%PORT%
npm run dev -- --host %HOST% --port %PORT%

