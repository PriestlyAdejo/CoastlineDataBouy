# Start backend + frontend in separate windows. Use: powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev_windows.ps1
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..")).Path
$ScriptsPath = Join-Path $RepoRoot "scripts"

Write-Host ""
Write-Host "Starting backend and frontend in new windows..." -ForegroundColor Cyan
Write-Host "Repo root: $RepoRoot" -ForegroundColor DarkGray
Write-Host "Backend:  http://127.0.0.1:8000/v1  (health: /v1/healthz, docs: /docs)" -ForegroundColor Green
Write-Host "Frontend: http://127.0.0.1:5173" -ForegroundColor Green
Write-Host ""

Start-Process powershell -ArgumentList @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-NoExit",
  "-Command", "Set-Location '$RepoRoot'; & '$ScriptsPath\run_backend_windows.ps1'"
)
Start-Process powershell -ArgumentList @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-NoExit",
  "-Command", "Set-Location '$RepoRoot'; & '$ScriptsPath\run_frontend_windows.ps1'"
)
