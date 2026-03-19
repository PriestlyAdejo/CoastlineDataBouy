# Docker in this project

Docker is **optional** for normal local development (frontend + FastAPI backend dev server). Use it when you need backend infrastructure (Postgres, object storage) or a reproducible environment.

## What Docker is used for

- **Postgres** — database for the backend API (users, ingest, metadata).
- **MinIO** — S3-compatible object storage for file uploads and artifacts.
- **Backend infrastructure parity** — same stack on every machine and in CI.

We do **not** run the FastAPI app or the Vite frontend inside Docker for day-to-day dev. You run those locally with Conda (`buoy-dev`) and Node.

## When Docker is **not** needed

- **Frontend-only work** — just run `scripts\run_frontend_windows.bat` (or `npm run dev`).
- **API/UI dev with lightweight config** — run `scripts\run_backend_windows.bat`; the backend can start without Postgres/MinIO and use in-memory or SQLite fallbacks if we add them, or you can point to a cloud DB.
- **Editing edge/Pi code** — no Docker; run tests and lint locally with the `buoy-dev` env.

## When Docker is useful

- You need a **real Postgres** and **MinIO** for ingest, uploads, or full API behaviour.
- You want **one-command** backend infra: `docker compose -f docker/compose.backend.yml up -d`.
- **CI** or **production-like** runs (e.g. integration tests against Postgres + MinIO).

## How to use `compose.backend.yml`

From repo root:

```bash
docker compose -f docker/compose.backend.yml up -d
```

This starts:

- **Postgres** on `localhost:5432` (user `nereus`, password `nereus`, db `nereus`).
- **MinIO** on `localhost:9000` (API) and `localhost:9001` (web console); default credentials `minioadmin` / `minioadmin`.

Then run the backend as usual (`scripts\run_backend_windows.bat`). Set env (or use defaults in code) so the API uses:

- `NEREUS_DATABASE_URL=postgresql+psycopg://nereus:nereus@localhost:5432/nereus`
- `NEREUS_S3_ENDPOINT_URL=http://localhost:9000` (and MinIO access keys if you change them).

To stop:

```bash
docker compose -f docker/compose.backend.yml down
```

## Summary

| Goal                         | Use Docker? |
|-----------------------------|-------------|
| Run frontend + backend dev  | No          |
| Postgres + MinIO for API    | Yes — `compose.backend.yml` |
| Pi/edge code, tests, lint   | No          |
| CI / prod-like testing      | Optional    |
