# Coastline Data Buoy — Software Stack

MECH0073 Coastal Buoy: **dashboard**, **edge (Raspberry Pi)** services, and **backend** for a hydrophone-led coastal sensing buoy.

## What’s in this repo

- **Dashboard**: Vite/React UI at the repository root.
- **Edge**: `edge/pi` (Python services, systemd, smoke tests) and `edge/firmware` (Arduino Nano 33 BLE Sense Rev2).
- **Backend**: `apps/api` (FastAPI + Postgres + object storage).
- **Shared contracts**: `schemas/` (JSON Schema; generated types for TS + Python).
- **Docs**: `docs/` (architecture, deployment, hardware).

---

## Local development (Windows, Conda + Node)

### Prerequisites

- **Conda** (Anaconda or Miniconda). [Download](https://docs.conda.io/en/latest/miniconda.html).
- **Node.js LTS** (for the frontend). [Download](https://nodejs.org/en/download/).
- **Git**.

### 1. Create/update the Conda env (`buoy-dev`)

From repo root (or from `scripts/` — scripts resolve repo root themselves):

```bat
scripts\setup_env_windows.bat
```

Or PowerShell (if execution policy allows, or use `-ExecutionPolicy Bypass`):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup_env_windows.ps1
```

This will:

- Create Conda env **`buoy-dev`** from `environment.yml` if it doesn’t exist, or update it if it does.
- Install backend and edge Python packages in **editable** mode into `buoy-dev`.
- Install frontend dependencies with `npm install` / `npm ci`.

**Create env only (no pip/npm):**

```bash
conda env create -f environment.yml
```

**Update env after changing `environment.yml`:**

```bash
conda env update -f environment.yml --prune
```

Then run `scripts\setup_env_windows.bat` again to re-run pip editable installs and npm install.

### 2. Interpreter in Cursor / VS Code

- **Do not** commit a hard-coded `python.defaultInterpreterPath` (machine-specific).
- After setup, choose the **`buoy-dev`** interpreter: **Ctrl+Shift+P** → **Python: Select Interpreter** → pick the one named `buoy-dev`.
- The repo’s `.vscode/settings.json` configures analysis paths for `apps/api/src` and `edge/pi/src` so imports resolve.

### 3. Run backend

Backend uses the **`buoy-dev`** Conda env (no need to activate it manually; the script uses `conda run -n buoy-dev`).

```bat
scripts\run_backend_windows.bat
```

- **API base**: http://127.0.0.1:8000/v1  
- **Docs**: http://127.0.0.1:8000/docs  
- **Health**: http://127.0.0.1:8000/v1/healthz  

### 4. Run frontend

Frontend only needs Node/npm (no Conda).

```bat
scripts\run_frontend_windows.bat
```

- **Dashboard**: http://127.0.0.1:5173  

### 5. Run both (two terminals)

```bat
scripts\dev_windows.bat
```

Opens two windows: backend and frontend.

---

## Docker: what it’s for and when it’s optional

**Docker is not required** for normal local UI/API development (frontend + backend dev server). You can run everything with Conda + Node as above.

Docker is used for:

- **Postgres** and **MinIO** (object storage) when you want a full backend stack.
- **Reproducible backend infrastructure** (same DB and S3-compatible storage across machines).
- **CI or production-like** runs.

See **`docker/README.md`** for:

- When to use `docker/compose.backend.yml`.
- How to run Postgres + MinIO for local backend development.
- When Docker is optional vs. useful.

---

## Troubleshooting

| Problem | What to do |
|--------|------------|
| **`npm` not recognized** | Install Node.js LTS; close and reopen the terminal. Ensure Node is on PATH. |
| **Conda not found** | Open **Anaconda Prompt** and run the scripts from there, or add Conda to PATH. |
| **Wrong working directory** | Scripts derive repo root from their own path (`%~dp0..` / `$PSScriptRoot`). Run from any folder under the repo. |
| **Editable install failures** | Run `scripts\setup_env_windows.bat` from repo root. If Python is wrong, ensure Conda env `buoy-dev` exists and is selected. |
| **Interpreter not showing in Cursor** | Reload window; run **Python: Select Interpreter** and pick `buoy-dev`. Conda must be on PATH for the extension to see envs. |
| **PowerShell execution policy** | Run: `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup_env_windows.ps1` or use the `.bat` scripts. |
| **Backend: uvicorn not found** | Ensure you ran `scripts\setup_env_windows.bat`; the run script uses `conda run -n buoy-dev` so `buoy-dev` must have the backend installed. |

---

## Quick start (dashboard only)

If you only need the frontend and already have Node:

```bash
npm install
npm run dev
```

---

## Development notes

- The dashboard can use mock data; we migrate screens to the backend API over time.
- The Pi stack is **offline-first**: record locally → index → upload when connected.
