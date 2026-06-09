@echo off
setlocal

set "HOST=127.0.0.1"
set "PORT=5173"
set "URL=http://%HOST%:%PORT%/?showcase=1&mode=brighton&readable=1"

echo Opening Brighton Marina showcase dashboard:
echo %URL%
start "" "%URL%"
