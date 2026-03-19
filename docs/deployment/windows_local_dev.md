# Windows local dev stack (Cursor + Conda base, no Docker)

## 1) Diagnosis of current setup failures

### PowerShell execution policy
Your machine is blocking script execution, producing:
`profile.ps1 cannot be loaded because running scripts is disabled...`

Fix: run scripts using `-ExecutionPolicy Bypass` + `-NoProfile`, or use `.bat`.

### `npm` not recognized
This means Node.js is not installed or PATH is not updated in the current terminal session.

Fix: install Node LTS, close/reopen terminals, re-run bootstrap.

### `setuptools>=...` build dependency failure
This typically happens when pip tries to build/install a Python project but the project is missing a proper `[build-system]` section, or pip/setuptools are too old in the current environment.

Fix: we added `[build-system]` and setuptools package discovery config to `apps/api/pyproject.toml` and `edge/pi/pyproject.toml`, and bootstrap now upgrades pip/setuptools/wheel first.

### `uvicorn is not recognized`
This is a symptom of backend deps not being installed. Use `python -m uvicorn ...` after successful `pip install -e apps/api[dev]`.

## 2) Exact run order (first time)

1. Open **Anaconda Prompt** (recommended) and ensure conda base:

```bat
conda activate base
```

2. From repo root, run bootstrap (pick one):

PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\bootstrap_windows.ps1
```

Batch:

```bat
.\scripts\bootstrap_windows.bat
```

## 3) Launch backend

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run_backend_windows.ps1
```

Verify:
- `http://127.0.0.1:8000/v1/healthz`

## 4) Launch frontend

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run_frontend_windows.ps1
```

Verify:
- `http://127.0.0.1:5173/`

## 5) Combined dev runner

PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev_windows.ps1
```

Batch:

```bat
.\scripts\dev_windows.bat
```

## 6) Testing checklist

- Backend starts without import errors.
- `GET /v1/healthz` returns `{ ok: true, ts: ... }`.
- Frontend starts and loads pages.
- Frontend shows API status on Telemetry page:
  - “connected” when backend is up
  - “offline (using mock data)” when backend is down

## 7) Troubleshooting

### PowerShell blocked
Always run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\bootstrap_windows.ps1
```

Or use `.bat` scripts.

### Node/npm missing
- Install Node LTS from `https://nodejs.org/en/download`
- Close + reopen Cursor terminals
- Re-run bootstrap

### pip/setuptools issues persist
Run these manually in the same terminal you’ll use to run backend:

```powershell
python -m ensurepip --upgrade
python -m pip install --upgrade pip setuptools wheel
```

### Cursor interpreter confusion (Conda base)
- Use **Anaconda Prompt** (base) to run scripts.
- In Cursor, select the Python interpreter that points to your conda base `python.exe`.

### OneDrive path problems
If installs are flaky due to file locking/sync:
- Pause OneDrive sync for the project folder during installs
- Avoid running multiple installs concurrently

### Port conflicts
- Backend default: 8000
- Frontend default: 5173

If busy, change ports using the script parameters:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run_backend_windows.ps1 -Port 8010
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run_frontend_windows.ps1 -Port 5180
```

