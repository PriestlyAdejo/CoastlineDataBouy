@echo off
setlocal

set "HOST=127.0.0.1"
set "PORT=5173"
set "URL=http://%HOST%:%PORT%/?handover=1&apiBase=http%%3A%%2F%%2F127.0.0.1%%3A8000%%2Fv1&readable=1"

echo Opening handover dashboard:
echo %URL%
start "" "%URL%"
