# Windows local dev — MECH0073 Coastal Buoy

Scripts work from **any** folder (repo root or `scripts/`); they always switch to repo root using the script’s location. No hard-coded interpreter paths; the recommended Python env is **`buoy-dev`** (Conda).

---

## 1. One-time setup (Conda env + deps)

Use the **`buoy-dev`** Conda env. Create/update it and install backend, edge, and frontend deps:

```bat
scripts\setup_env_windows.bat
```

Or PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup_env_windows.ps1
```

This:

- Creates or updates the **`buoy-dev`** env from `environment.yml`.
- Installs `apps/api` and `edge/pi` in **editable** mode into `buoy-dev`.
- Runs `npm install` at repo root.

**Where to run:** Anaconda Prompt, or any terminal where `conda` and `node`/`npm` are on PATH.

---

## 2. Run backend

Uses **`buoy-dev`** via `conda run` (no manual activate needed).

```bat
scripts\run_backend_windows.bat
```

- API: http://127.0.0.1:8000/v1  
- Docs: http://127.0.0.1:8000/docs  
- Health: http://127.0.0.1:8000/v1/healthz  

---

## 3. Run frontend

Uses Node/npm only (no Conda).

```bat
scripts\run_frontend_windows.bat
```

- Dashboard: http://127.0.0.1:5173  

---

## 4. Run both

```bat
scripts\dev_windows.bat
```

Opens two windows (backend + frontend).

---

## 5. Cursor / VS Code

- **Python:** Select interpreter **`buoy-dev`** (Ctrl+Shift+P → “Python: Select Interpreter”).
- Do **not** commit a machine-specific `python.defaultInterpreterPath`; the repo’s `.vscode/settings.json` only sets analysis paths and pytest.

---

## 6. Troubleshooting

| Problem | What to do |
|--------|------------|
| **`npm` not recognized** | Install Node.js LTS; close and reopen the terminal. |
| **Conda not found** | Open **Anaconda Prompt** or add Conda to PATH. |
| **`buoy-dev` not found** | Run `scripts\setup_env_windows.bat` first. |
| **Wrong working directory** | Scripts use `%~dp0..` (bat) / `$PSScriptRoot` (ps1); run from anywhere under the repo. |
| **Editable install fails** | Run setup from repo root; ensure `environment.yml` and `apps\api` / `edge\pi` exist. |
| **PowerShell execution policy** | Use `-ExecutionPolicy Bypass` when calling `.ps1`, or use the `.bat` scripts. |

---

## 7. Legacy bootstrap (any Python)

If you prefer not to use `buoy-dev` and want to use the **current** Python (e.g. Conda `base`):

```bat
scripts\bootstrap_windows.bat
```

Then run backend with that env activated (e.g. `scripts\run_backend_windows.bat` will still expect `buoy-dev`; for legacy flow you’d activate base and run `python -m uvicorn nereus_api.main:app --reload --host 127.0.0.1 --port 8000` from repo root). The **recommended** path is `setup_env_windows.bat` + `buoy-dev`.
