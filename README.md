
# Coastline Data Buoy — Software Stack

This repository contains the **dashboard**, **edge (Raspberry Pi)** services, and **backend** for a hydrophone-led coastal sensing buoy.

## What’s in this repo

- **Dashboard (existing)**: Vite/React UI at the repository root (do not delete; we integrate around it).
- **Edge (to run on the buoy)**: `edge/pi` (Python services, systemd, smoke tests) and `edge/firmware` (Arduino Nano 33 BLE Sense Rev2 firmware).
- **Backend (to run on a VPS)**: `apps/api` (FastAPI + worker + Postgres + object storage integration).
- **Shared contracts**: `schemas/` (JSON Schema source of truth; generated types for TS + Python).
- **Docs**: `docs/` (architecture, deployment, hardware notes).

## Quick start (dashboard)

```bash
npm i
npm run dev
```

## Development notes

- The dashboard currently uses **mock data** for many screens. We will migrate it incrementally to the backend API.\n+- The Pi stack is designed **offline-first**: record locally → index → upload when connected.\n+
  