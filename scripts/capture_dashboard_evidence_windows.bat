@echo off
cd /d "%~dp0.."
call npm run capture:evidence
exit /b %ERRORLEVEL%
