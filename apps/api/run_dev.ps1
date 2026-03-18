param(
  [string]$HostAddr = "127.0.0.1",
  [int]$Port = 8000
)

$env:PYTHONPATH = (Join-Path $PSScriptRoot "src")

python -m uvicorn nereus_api.main:app --reload --host $HostAddr --port $Port

