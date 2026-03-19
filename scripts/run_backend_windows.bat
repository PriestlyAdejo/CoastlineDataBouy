@echo off
setlocal

where python >nul 2>nul
if errorlevel 1 (
  echo ERROR: python not found. Run from Anaconda Prompt with: conda activate base
  exit /b 2
)

for /f "usebackq delims=" %%i in (`python -c "import sys; print(sys.executable)"`) do set PYEXE=%%i
echo Python: %PYEXE%
echo CONDA_DEFAULT_ENV: %CONDA_DEFAULT_ENV%

set PYTHONPATH=%~dp0..\apps\api\src

if "%NEREUS_BUOY_UPLOAD_TOKEN%"=="" set NEREUS_BUOY_UPLOAD_TOKEN=dev-token-change-me
if "%NEREUS_API_PREFIX%"=="" set NEREUS_API_PREFIX=/v1

set HOST=127.0.0.1
set PORT=8000

echo Starting FastAPI on http://%HOST%:%PORT%/v1
python -m uvicorn nereus_api.main:app --reload --host %HOST% --port %PORT%

