# Downloads and Exports

Files endpoint:

```bash
curl http://127.0.0.1:8000/v1/files
```

Exports:

```bash
curl http://127.0.0.1:8000/v1/exports/latest_snapshot.json
curl http://127.0.0.1:8000/v1/exports/telemetry.csv
curl http://127.0.0.1:8000/v1/exports/environment.csv
curl http://127.0.0.1:8000/v1/exports/health.csv
curl http://127.0.0.1:8000/v1/exports/wave_stats.csv
```

File statuses:
- `available`: downloadable now from backend.
- `file_on_pi_not_synced`: metadata only, binary still on Pi/not synced.
- `pending`: waiting for uploader/sync.
