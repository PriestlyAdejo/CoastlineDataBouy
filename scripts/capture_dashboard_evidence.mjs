#!/usr/bin/env node
/**
 * MECH0073 dashboard evidence capture — full-page screenshots, API JSON, logs.
 * Usage: node scripts/capture_dashboard_evidence.mjs [--headed] [--no-demo] ...
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const DEMO_MODE = "brighton-marina-2026-05-01";

const ROUTES = [
  { path: "/", file: "overview.png", name: "Overview", checks: [/ucl-buoy|field deployment/i, /water|temp/i, /battery/i] },
  { path: "/telemetry", file: "telemetry.png", name: "Telemetry", checks: [/telemetry/i, /packet|upload/i] },
  { path: "/environment", file: "environment.png", name: "Environment", checks: [/environmental/i, /water temp|temperature/i] },
  { path: "/map", file: "map.png", name: "Location / Map", checks: [/gps|map|location/i], map: true },
  { path: "/system-health", file: "system-health.png", name: "System Health", checks: [/system health/i, /cpu|memory|storage/i] },
  { path: "/alerts", file: "alerts.png", name: "Alerts", checks: [/alert/i] },
  { path: "/data", file: "historical-data.png", name: "Historical Data", checks: [/archive|historical/i] },
  { path: "/files", file: "files-downloads.png", name: "Files / Downloads", checks: [/files/i, /search|\.wav|\.csv|\.json/i] },
  { path: "/hydrophone", file: "hydrophone-summary.png", name: "Hydrophone Summary", checks: [/acoustic|hydrophone/i] },
  { path: "/hydrophone/daily-events", file: "hydrophone-daily-events.png", name: "Daily Events", checks: [/daily events|hydrophone/i] },
  { path: "/hydrophone/acoustic-events", file: "hydrophone-acoustic-events.png", name: "Acoustic Events", checks: [/acoustic events|hydrophone/i] },
  { path: "/hydrophone/soundscape", file: "hydrophone-soundscape.png", name: "Soundscape", checks: [/soundscape|hydrophone/i] },
  { path: "/hydrophone/spectral", file: "hydrophone-spectral-density.png", name: "Spectral Density", checks: [/spectral|hydrophone/i] },
  { path: "/hydrophone/levels", file: "hydrophone-sound-levels.png", name: "Sound Levels", checks: [/sound levels|hydrophone/i] },
  { path: "/hydrophone/effort", file: "hydrophone-recording-effort.png", name: "Recording Effort", checks: [/recording effort|hydrophone/i] },
];

function parseArgs(argv) {
  const opts = {
    frontend: "http://localhost:5173",
    api: "http://127.0.0.1:8000/v1",
    node: "ucl-buoy",
    headed: false,
    demo: true,
    delay: 2500,
    mapDelay: 5000,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--headed") opts.headed = true;
    else if (a === "--no-demo") opts.demo = false;
    else if (a === "--frontend" && argv[i + 1]) opts.frontend = argv[++i].replace(/\/$/, "");
    else if (a === "--api" && argv[i + 1]) opts.api = argv[++i].replace(/\/$/, "");
    else if (a === "--node" && argv[i + 1]) opts.node = argv[++i];
    else if (a === "--delay" && argv[i + 1]) opts.delay = Number(argv[++i]);
    else if (a === "--map-delay" && argv[i + 1]) opts.mapDelay = Number(argv[++i]);
  }
  return opts;
}

function tsFolder() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function appendJsonl(filePath, obj) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, JSON.stringify(obj) + "\n", "utf8");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = { _raw: text.slice(0, 2000), _parseError: true };
    }
    return { ok: res.ok, status: res.status, url, body };
  } catch (e) {
    return { ok: false, status: null, url, error: e instanceof Error ? e.message : String(e), body: null };
  } finally {
    clearTimeout(t);
  }
}

function dig(obj, ...keys) {
  let cur = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== "object") return null;
    cur = cur[k];
  }
  return cur ?? null;
}

function extractSnapshotFields(snap) {
  if (!snap || typeof snap !== "object") return null;
  const tel = snap.telemetry ?? {};
  const replay = tel.replay ?? snap.health?.replay ?? snap.env?.replay ?? {};
  const gps = tel.gps ?? replay.gps ?? replay.location ?? {};
  const env = snap.env ?? {};
  const replayEnv = replay.environment ?? {};
  const health = snap.health ?? {};
  const storage = health.storage ?? {};
  const upload = replay.upload ?? {};
  const acoustics = snap.acoustics ?? {};
  const wave = snap.wave_stats ?? {};

  return {
    ts: snap.ts ?? null,
    phase_key: replay.phase_key ?? replay.phase_id ?? null,
    phase_label: replay.phase_label ?? null,
    test_time_local: replay.test_time_local ?? null,
    gps_lat: gps.lat ?? replay.location?.lat ?? null,
    gps_lon: gps.lon ?? replay.location?.lon ?? null,
    water_temp_c: env.water_temp_c ?? replayEnv.water_temp_c ?? null,
    battery_pack_v: tel.pack_v ?? replay.battery_pack_v ?? null,
    battery_soc_pct: tel.soc_pct ?? replay.battery_soc_pct ?? null,
    storage_free_bytes: storage.free_bytes ?? null,
    storage_used_bytes: storage.used_bytes ?? null,
    storage_total_bytes: storage.total_bytes ?? null,
    telemetry_seq: tel.seq ?? null,
    files_uploaded: upload.files_uploaded ?? null,
    files_pending: upload.files_pending ?? null,
    acoustic_leq_db: acoustics.leq_db ?? replay.acoustic_display?.leq_display_db ?? null,
    wave_hs_m: wave.hs_m ?? replay.wave?.hs_m ?? null,
  };
}

function buildSnapshotDelta(t0, t10) {
  const a = extractSnapshotFields(t0?.body ?? t0);
  const b = extractSnapshotFields(t10?.body ?? t10);
  const keys = a ? Object.keys(a) : b ? Object.keys(b) : [];
  const delta = {};
  for (const k of keys) {
    delta[k] = { t0: a?.[k] ?? null, t10: b?.[k] ?? null, changed: (a?.[k] ?? null) !== (b?.[k] ?? null) };
  }
  return { capturedAt: new Date().toISOString(), t0: a, t10: b, fields: delta };
}

async function fetchOpenApi(apiBase) {
  const root = apiBase.replace(/\/v1\/?$/, "");
  const urls = [`${root}/openapi.json`, `${apiBase}/openapi.json`];
  for (const url of urls) {
    const r = await fetchJson(url);
    if (r.ok && r.body && !r.body._parseError) {
      return { ...r, attemptedUrls: urls };
    }
  }
  const last = await fetchJson(urls[0]);
  return {
    ok: false,
    status: last.status,
    attemptedUrls: urls,
    error: "OpenAPI not found at expected URLs",
    body: last.body,
  };
}

function copyDirRecursive(src, dest) {
  ensureDir(dest);
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) copyDirRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

function clearDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) fs.rmSync(p, { recursive: true, force: true });
    else fs.unlinkSync(p);
  }
}

function routeManifestJson() {
  return ROUTES.map((r) => ({
    route: r.path,
    screenshot: r.file,
    pageName: r.name,
    expectedDataSource: "GET /v1/nodes/ucl-buoy/snapshots/latest + BrightonReplayProvider local engine",
    expectedVisibleValues: r.checks.map((c) => c.source),
    requiresApiSnapshot: true,
    notes: r.map ? "Extra map-container.png; extended Leaflet wait" : "",
  }));
}

function dashboardRouteFlowMmd() {
  return `flowchart TD
  user[User opens dashboard] --> ls[localStorage demo mode and API base URL]
  ls --> route[React Router page route]
  route --> poll[BrightonReplayProvider polls snapshots/latest]
  poll --> vm[buildDeploymentViewModel]
  vm --> ui[Page cards charts map panels]
`;
}

function dashboardDataFlowMmd() {
  return `flowchart TD
  seeder[seed_brighton_marina_replay.py] --> ingest[POST /v1/ingest health env telemetry acoustic_meta wave_stats]
  ingest --> db[(Database snapshots)]
  db --> latest[GET /v1/nodes/ucl-buoy/snapshots/latest]
  latest --> fe[Frontend API client poll]
  fe --> pages[Dashboard pages]
`;
}

function evidenceReadme(opts, runDir) {
  return `# Dashboard evidence capture

Generated: ${new Date().toISOString()}

## Run this capture

\`\`\`bat
npm run capture:evidence
\`\`\`

Or headed (visible browser):

\`\`\`bat
npm run capture:evidence:headed
\`\`\`

Or:

\`\`\`bat
scripts\\capture_dashboard_evidence_windows.bat
\`\`\`

## Full stack (Windows, 5 terminals)

**Terminal 1 — database**

\`\`\`bat
docker compose -f docker\\compose.backend.yml up -d
\`\`\`

**Terminal 2 — API migrations + backend**

\`\`\`bat
cd apps\\api
python -m alembic -c alembic.ini upgrade head
cd ..\\..
scripts\\run_backend_windows.bat
\`\`\`

**Terminal 3 — frontend**

\`\`\`bat
scripts\\run_frontend_windows.bat
\`\`\`

**Terminal 4 — Brighton live replay seeder**

\`\`\`bat
python scripts\\seed_brighton_marina_replay.py --input scripts\\brighton_marina_seed_input.json --api-base http://127.0.0.1:8000/v1 --token STRONG_UPLOAD_TOKEN_69420 --interval 5 --mode live-replay
\`\`\`

**Terminal 5 — evidence capture**

\`\`\`bat
npm run capture:evidence
\`\`\`

See also [scripts/BRIGHTON_REPLAY.md](../../scripts/BRIGHTON_REPLAY.md).

## Output folders

| Path | Purpose |
|------|---------|
| \`screenshots/latest/\` | Latest run (overwritten each capture) |
| \`screenshots/runs/<timestamp>/\` | Archived run |
| \`pages/*.png\` | Full-page UI evidence per route |
| \`api/*.json\` | Backend API responses and snapshot delta |
| \`logs/*.jsonl\` | Network, console, summary |

This run folder: \`${runDir.replace(/\\/g, "/")}\`

## Brighton replay mode

Before screenshots, the script sets:

- \`nereus.apiBaseUrl\` = \`${opts.api}\`
- \`nereus.demoMode\` = \`${opts.demo ? DEMO_MODE : "(disabled)"}\`

Disable demo for Clyde UI: \`node scripts/capture_dashboard_evidence.mjs --no-demo\`

## What each screenshot proves

Each PNG shows the operational dashboard for that route with replay chrome, live metrics, and charts/map as rendered at capture time.

## What each API file proves

| File | Proves |
|------|--------|
| \`healthz.json\` | API process reachable |
| \`nodes.json\` | Node registry |
| \`ucl-buoy-latest-snapshot.json\` | Merged latest payload for the buoy |
| \`ucl-buoy-latest-snapshot-t0.json\` / \`t10.json\` | Snapshot stability / live seeder movement |
| \`snapshot-delta.json\` | Field-level changes over 10 seconds |
| \`openapi.json\` | API schema (if exposed) |

## Data flow

The dashboard reads \`GET /v1/nodes/ucl-buoy/snapshots/latest\` (see \`dashboard_data_flow.mmd\`). Pages bind via \`useDeploymentView()\` when Brighton demo is enabled.
`;
}

async function runVisibleChecks(page, routeDef) {
  const body = await page.locator("body").innerText().catch(() => "");
  const hasLeaflet = (await page.locator(".leaflet-container").count()) > 0;
  const failed = [];
  for (const re of routeDef.checks) {
    if (re.source.includes("leaflet")) continue;
    if (!re.test(body)) failed.push(re.source);
  }
  if (routeDef.map && !hasLeaflet && !/gps|map/i.test(body)) {
    failed.push("leaflet-container or map text");
  }
  if (failed.length === 0) return { pass: true, reason: "visible checks ok" };
  return { pass: false, reason: `missing patterns: ${failed.join(", ")}` };
}

async function captureRoutes(opts, runDir, summary, logPaths) {
  const pagesDir = path.join(runDir, "pages");
  ensureDir(pagesDir);

  const browser = await chromium.launch({ headless: !opts.headed });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
  });
  await context.grantPermissions([]);

  const page = await context.newPage();
  let currentRoute = "(init)";

  page.on("console", (msg) => {
    appendJsonl(logPaths.console, {
      timestamp: new Date().toISOString(),
      route: currentRoute,
      type: msg.type(),
      text: msg.text(),
    });
    if (msg.type() === "error") summary.consoleErrors += 1;
  });

  page.on("request", (req) => {
    appendJsonl(logPaths.network, {
      timestamp: new Date().toISOString(),
      route: currentRoute,
      method: req.method(),
      url: req.url(),
      resourceType: req.resourceType(),
    });
  });

  page.on("requestfailed", (req) => {
    const failure = req.failure();
    appendJsonl(logPaths.failures, {
      timestamp: new Date().toISOString(),
      route: currentRoute,
      url: req.url(),
      failure: failure?.errorText ?? "unknown",
    });
    summary.failedRequests += 1;
  });

  page.on("response", (res) => {
    const req = res.request();
    appendJsonl(logPaths.network, {
      timestamp: new Date().toISOString(),
      route: currentRoute,
      method: req.method(),
      url: req.url(),
      status: res.status(),
      resourceType: req.resourceType(),
    });
  });

  try {
    currentRoute = "(storage-init)";
    await page.goto(opts.frontend, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.evaluate(
      ({ api, demo, demoKey }) => {
        localStorage.setItem("nereus.apiBaseUrl", api);
        if (demo) localStorage.setItem("nereus.demoMode", demoKey);
        else localStorage.removeItem("nereus.demoMode");
      },
      { api: opts.api, demo: opts.demo, demoKey: DEMO_MODE },
    );

    for (const routeDef of ROUTES) {
      currentRoute = routeDef.path;
      const routeResult = {
        route: routeDef.path,
        screenshot: routeDef.file,
        status: "pending",
        visibleCheck: null,
        error: null,
      };
      summary.routes.push(routeResult);

      try {
        const url = `${opts.frontend}${routeDef.path === "/" ? "/" : routeDef.path}`;
        try {
          await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
        } catch {
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
          await sleep(opts.delay);
        }
        await sleep(opts.delay);
        await page.evaluate(() => window.scrollTo(0, 0));

        if (routeDef.map) {
          await sleep(opts.mapDelay);
          await page.evaluate(() => {
            window.dispatchEvent(new Event("resize"));
            try {
              const maps = [];
              document.querySelectorAll(".leaflet-container").forEach((el) => {
                const m = el._leaflet_map ?? el.__leaflet_map;
                if (m && typeof m.invalidateSize === "function") maps.push(m);
              });
              maps.forEach((m) => m.invalidateSize());
            } catch {
              /* ignore */
            }
          });
          await sleep(500);
          const mapEl = page.locator(".leaflet-container").first();
          if ((await mapEl.count()) > 0) {
            await mapEl.screenshot({ path: path.join(pagesDir, "map-container.png") });
            summary.screenshots.push("map-container.png");
          }
        }

        const outPath = path.join(pagesDir, routeDef.file);
        await page.screenshot({ path: outPath, fullPage: true });
        summary.screenshots.push(routeDef.file);
        routeResult.status = "ok";

        const check = await runVisibleChecks(page, routeDef);
        routeResult.visibleCheck = check;
        if (!check.pass) routeResult.status = "visible_check_fail";
      } catch (e) {
        routeResult.status = "error";
        routeResult.error = e instanceof Error ? e.message : String(e);
        summary.failedRoutes.push(routeDef.path);
        console.error(`[FAIL] ${routeDef.path}: ${routeResult.error}`);
      }
    }
  } finally {
    await browser.close();
  }
}

async function captureApiEvidence(opts, runDir, summary) {
  const apiDir = path.join(runDir, "api");
  ensureDir(apiDir);

  const openapi = await fetchOpenApi(opts.api);
  writeJson(path.join(apiDir, "openapi.json"), openapi.ok ? openapi.body : openapi);
  summary.apiFiles.push("openapi.json");

  for (const [name, url] of [
    ["healthz.json", `${opts.api}/healthz`],
    ["nodes.json", `${opts.api}/nodes`],
    ["ucl-buoy-latest-snapshot.json", `${opts.api}/nodes/${opts.node}/snapshots/latest`],
  ]) {
    const r = await fetchJson(url);
    writeJson(path.join(apiDir, name), r.ok ? r.body : r);
    summary.apiFiles.push(name);
    if (!r.ok) summary.apiFailures.push({ file: name, url, error: r.error ?? `HTTP ${r.status}` });
  }

  const t0 = await fetchJson(`${opts.api}/nodes/${opts.node}/snapshots/latest`);
  writeJson(path.join(apiDir, "ucl-buoy-latest-snapshot-t0.json"), t0.ok ? t0.body : t0);
  summary.apiFiles.push("ucl-buoy-latest-snapshot-t0.json");

  console.log("Waiting 10s for snapshot t10...");
  await sleep(10000);

  const t10 = await fetchJson(`${opts.api}/nodes/${opts.node}/snapshots/latest`);
  writeJson(path.join(apiDir, "ucl-buoy-latest-snapshot-t10.json"), t10.ok ? t10.body : t10);
  summary.apiFiles.push("ucl-buoy-latest-snapshot-t10.json");

  const delta = buildSnapshotDelta(t0, t10);
  writeJson(path.join(apiDir, "snapshot-delta.json"), delta);
  summary.apiFiles.push("snapshot-delta.json");
}

async function main() {
  const opts = parseArgs(process.argv);
  const runId = tsFolder();
  const runDir = path.join(REPO_ROOT, "screenshots", "runs", runId);
  const latestDir = path.join(REPO_ROOT, "screenshots", "latest");

  ensureDir(path.join(runDir, "pages"));
  ensureDir(path.join(runDir, "api"));
  ensureDir(path.join(runDir, "logs"));

  const logPaths = {
    network: path.join(runDir, "logs", "network_requests.jsonl"),
    failures: path.join(runDir, "logs", "network_failures.jsonl"),
    console: path.join(runDir, "logs", "console_messages.jsonl"),
  };

  const summary = {
    capturedAt: new Date().toISOString(),
    runId,
    frontendBaseUrl: opts.frontend,
    backendApiUrl: opts.api,
    nodeId: opts.node,
    demoMode: opts.demo ? DEMO_MODE : null,
    delayMs: opts.delay,
    mapDelayMs: opts.mapDelay,
    routes: [],
    routeList: ROUTES.map((r) => r.path),
    screenshots: [],
    apiFiles: [],
    apiFailures: [],
    consoleErrors: 0,
    failedRequests: 0,
    failedRoutes: [],
    frontendReachable: null,
  };

  console.log("CoastlineDataBouy — dashboard evidence capture");
  console.log(`Run folder: screenshots/runs/${runId}`);

  const feProbe = await fetch(opts.frontend, { signal: AbortSignal.timeout(8000) }).catch((e) => ({
    ok: false,
    error: e,
  }));
  summary.frontendReachable = feProbe.ok ?? false;
  if (!summary.frontendReachable) {
    console.warn(`WARNING: Frontend not reachable at ${opts.frontend}`);
    console.warn("Start: scripts\\run_frontend_windows.bat");
  }

  await captureApiEvidence(opts, runDir, summary);

  if (summary.frontendReachable) {
    await captureRoutes(opts, runDir, summary, logPaths);
  } else {
    console.warn("Skipping browser screenshots (frontend offline).");
    for (const r of ROUTES) {
      summary.routes.push({
        route: r.path,
        screenshot: r.file,
        status: "skipped",
        error: "frontend unreachable",
      });
      summary.failedRoutes.push(r.path);
    }
  }

  writeJson(path.join(runDir, "route_manifest.json"), routeManifestJson());
  fs.writeFileSync(path.join(runDir, "dashboard_route_flow.mmd"), dashboardRouteFlowMmd(), "utf8");
  fs.writeFileSync(path.join(runDir, "dashboard_data_flow.mmd"), dashboardDataFlowMmd(), "utf8");
  fs.writeFileSync(
    path.join(runDir, "DASHBOARD_EVIDENCE_README.md"),
    evidenceReadme(opts, path.relative(REPO_ROOT, runDir)),
    "utf8",
  );

  writeJson(path.join(runDir, "logs", "capture_summary.json"), summary);

  clearDir(latestDir);
  ensureDir(latestDir);
  copyDirRecursive(runDir, latestDir);

  const okRoutes = summary.routes.filter((r) => r.status === "ok").length;
  const totalRoutes = ROUTES.length;

  console.log("\n--- Capture summary ---");
  console.log(`Latest:  screenshots/latest/`);
  console.log(`Archive: screenshots/runs/${runId}/`);
  console.log(`Screenshots: ${summary.screenshots.length} files`);
  console.log(`Routes OK: ${okRoutes}/${totalRoutes}`);
  if (summary.failedRoutes.length) console.log(`Failed routes: ${summary.failedRoutes.join(", ")}`);
  if (summary.apiFailures.length) {
    console.log("API failures:");
    summary.apiFailures.forEach((f) => console.log(`  - ${f.file}: ${f.error ?? f.url}`));
  }
  console.log(`Console errors: ${summary.consoleErrors}`);
  console.log(`Failed network requests: ${summary.failedRequests}`);
  console.log(`Summary JSON: screenshots/latest/logs/capture_summary.json`);

  process.exit(summary.failedRoutes.length > 0 || summary.apiFailures.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
