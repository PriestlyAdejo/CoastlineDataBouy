@echo off
setlocal

echo Launching backend + frontend in separate windows...

start "Nereus Backend" cmd /k "%~dp0run_backend_windows.bat"
start "Nereus Frontend" cmd /k "%~dp0run_frontend_windows.bat"

