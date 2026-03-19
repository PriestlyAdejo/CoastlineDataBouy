param(
  [int]$BackendPort = 8000,
  [int]$FrontendPort = 5173
)

$ErrorActionPreference = "Stop"

Write-Host "Launching backend + frontend in separate windows." -ForegroundColor Cyan
Write-Host "If PowerShell scripts are blocked, use the .bat runner instead." -ForegroundColor Yellow

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Start-Process powershell -ArgumentList @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-WorkingDirectory", $repoRoot,
  "-File", (Join-Path $repoRoot "scripts\run_backend_windows.ps1"),
  "-Port", $BackendPort
)

Start-Process powershell -ArgumentList @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-WorkingDirectory", $repoRoot,
  "-File", (Join-Path $repoRoot "scripts\run_frontend_windows.ps1"),
  "-Port", $FrontendPort
)

