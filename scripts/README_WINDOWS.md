# How to run this project on Windows

This guide gets the coastal buoy **frontend** and **backend** running on your Windows machine with minimal manual steps. Scripts work from **any** folder (repo root or `scripts`); they always switch to the repo root using the script’s location.

---

## 1. Where to open the terminal

- **Recommended:** **Anaconda Prompt** (so `python` is Conda’s and `conda activate base` works).
- **Alternative:** PowerShell or CMD from Cursor/VS Code. If you use PowerShell and get “running scripts is disabled”, run scripts with:
  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\bootstrap_windows.ps1
  ```
- You do **not** need to `cd` into the repo first. The scripts detect the repo root from their own path. You can run from:
  - `...\CoastlineDataBouy\` (repo root), or
  - `...\CoastlineDataBouy\scripts\`

---

## 2. One-time bootstrap

This installs backend (FastAPI) and frontend (Node) dependencies.

**Option A – Batch (works in CMD / Anaconda Prompt):**

```bat
scripts\bootstrap_windows.bat
```

**Option B – PowerShell (if you prefer .ps1):**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\bootstrap_windows.ps1
```

Bootstrap will:

- Check that `apps\api\pyproject.toml` and `package.json` exist (repo layout).
- Use the **current** `python` (Conda base if you’re in Anaconda Prompt).
- Upgrade pip/setuptools/wheel and install the backend as editable: `pip install -e "<repo>\apps\api[dev]"` (using repo root from script path, so it works even if you started in `scripts`).
- Install Node dependencies with `npm install` (or `npm ci` if `package-lock.json` exists).
- Run a quick “backend import OK” check.

If **Node/npm** are missing, the script will stop and tell you to install Node.js LTS and reopen the terminal. If **Python** is missing, it will tell you to use Anaconda Prompt or fix PATH.

---

## 3. Run the backend

Backend runs at **http://127.0.0.1:8000**. API prefix: `/v1` (e.g. health: `http://127.0.0.1:8000/v1/healthz`).

**Batch:**

```bat
scripts\run_backend_windows.bat
```

**PowerShell:**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run_backend_windows.ps1
```

- Script switches to repo root, checks for `apps\api\pyproject.toml`, and if `uvicorn` is missing runs a one-time `pip install -e "<repo>\apps\api[dev]"` (again using the script-derived repo path).
- Then it starts: `python -m uvicorn nereus_api.main:app --reload --host 127.0.0.1 --port 8000`.

**Useful URLs:**

- Health: http://127.0.0.1:8000/v1/healthz  
- Docs: http://127.0.0.1:8000/docs  

---

## 4. Run the frontend

Frontend runs at **http://127.0.0.1:5173** (Vite default).

**Batch:**

```bat
scripts\run_frontend_windows.bat
```

**PowerShell:**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run_frontend_windows.ps1
```

- Script switches to repo root, checks for `package.json`, ensures Node/npm exist, and if `node_modules` is missing runs `npm install` once.
- Then it runs: `npm run dev -- --host 127.0.0.1 --port 5173`.

The dashboard uses the backend at **http://127.0.0.1:8000/v1** via `.env.local` (`VITE_API_BASE`). You can override in the app with `localStorage` key `nereus.apiBaseUrl` if needed.

---

## 5. Run both (backend + frontend)

Two separate windows (backend in one, frontend in the other):

**Batch:**

```bat
scripts\dev_windows.bat
```

**PowerShell:**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev_windows.ps1
```

---

## 6. Exact command sequence (copy-paste)

After your first-time setup, you can do:

1. Open **Anaconda Prompt** (or a terminal where `python` is Conda base).
2. Go to repo root (optional; scripts work from `scripts` too):
   ```bat
   cd "C:\Users\...\CoastlineDataBouy"
   ```
3. Bootstrap (once):
   ```bat
   scripts\bootstrap_windows.bat
   ```
4. Start backend (leave this window open):
   ```bat
   scripts\run_backend_windows.bat
   ```
5. In a **second** terminal, start frontend:
   ```bat
   scripts\run_frontend_windows.bat
   ```
6. Open in browser:
   - Dashboard: http://127.0.0.1:5173  
   - API docs: http://127.0.0.1:8000/docs  
   - Health: http://127.0.0.1:8000/v1/healthz  

---

## 7. Common failure cases and fixes

| Problem | What to do |
|--------|-------------|
| **“python not found”** | Use **Anaconda Prompt** and run `conda activate base`, or add Conda/Python to PATH. |
| **“node/npm not recognized”** | Install Node.js LTS from https://nodejs.org/en/download, **close and reopen** the terminal, then rerun. |
| **“profile.ps1 cannot be loaded / running scripts is disabled”** | Don’t rely on your profile. Run: `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run_backend_windows.ps1` (and same pattern for other .ps1 scripts). Or use the `.bat` versions. |
| **“.\apps\api is not a valid editable requirement”** | You were probably in `scripts` and something used a relative path. The **updated** scripts no longer depend on current directory: they compute repo root from the script path and use that for all paths. Run the script again from **any** folder; if it still fails, ensure you’re in the right repo (you should see `apps\api\pyproject.toml` and `package.json` at repo root). |
| **“uvicorn is not recognized”** | Backend deps weren’t installed. Run `scripts\bootstrap_windows.bat` once, or run `scripts\run_backend_windows.bat` (it will try a one-time install). If it still fails, from repo root run: `python -m pip install --no-build-isolation -e ".\apps\api[dev]"`. |
| **“vite is not recognized”** | Frontend deps weren’t installed. Run `scripts\bootstrap_windows.bat` once, or run `scripts\run_frontend_windows.bat` (it will run `npm install` if `node_modules` is missing). Run from repo root so `package.json` and `node_modules` are in the same place. |
| **pip / setuptools / build errors** | Scripts use `--no-build-isolation` so your current environment’s setuptools/wheel are used. Ensure Conda base is activated and run: `python -m pip install --upgrade pip setuptools wheel`, then rerun bootstrap. |
| **Cursor/terminal doesn’t see Conda** | Use **Anaconda Prompt** for backend; use the same or a normal CMD/PowerShell for frontend. Scripts only need `python` and `node`/`npm` on PATH. |

---

## 8. What the scripts guarantee

- **Repo root** is derived from the script’s directory (`%~dp0..` in .bat, `$PSScriptRoot` / `$MyInvocation.MyCommand.Path` in .ps1), **not** from the current working directory.
- **Backend** install uses the **absolute** path to `apps\api` (e.g. `%CD%` after switching to repo root in .bat, `$RepoRoot` in .ps1), so “invalid editable requirement” from the wrong folder should not happen.
- **PowerShell** scripts avoid depending on your profile; use `-NoProfile -ExecutionPolicy Bypass` when calling them if your policy blocks scripts.
- **Health checks**: Bootstrap and run scripts check for `apps\api\pyproject.toml`, `package.json`, Python, Node/npm, and (where relevant) backend import and `node_modules`, and print clear errors if something is missing.

You can run the app with: **one bootstrap**, **one backend command**, **one frontend command**, then open the URLs above.
