# Windows local dev (Conda base, no Docker)

These scripts assume you are running inside the **Conda `base`** environment.

## PowerShell execution policy

If you see `running scripts is disabled on this system`, run PowerShell scripts like this:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\bootstrap_windows.ps1
```

If you don’t want to use PowerShell scripts, use the `.bat` equivalents.

## First-time bootstrap (installs everything)

### Option A: PowerShell

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\bootstrap_windows.ps1
```

### Option B: Batch

```bat
.\scripts\bootstrap_windows.bat
```

## Run backend

### PowerShell

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run_backend_windows.ps1
```

Backend URL: `http://127.0.0.1:8000/v1/healthz`

## Run frontend

### PowerShell

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run_frontend_windows.ps1
```

Frontend URL (default): `http://127.0.0.1:5173/`

## Run both

### PowerShell

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev_windows.ps1
```

### Batch

```bat
.\scripts\dev_windows.bat
```

## Frontend → backend API base

The frontend uses `.env.local` in the repo root:

- `VITE_API_BASE=http://127.0.0.1:8000/v1`

You can also override at runtime using browser localStorage key:

- `nereus.apiBaseUrl`

