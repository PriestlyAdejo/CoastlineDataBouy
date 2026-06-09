export type ApiClientOptions = {
  baseUrl: string;
};

export type LocationSnapshot = {
  lat?: number;
  lon?: number;
  source?: string;
  quality?: string;
  fix_status?: string;
  satellites?: number;
  hdop?: number;
  reason?: string;
  timestamp?: string;
};

export type LatestSnapshots = {
  node_id: string;
  telemetry: unknown | null;
  env: unknown | null;
  health: unknown | null;
  acoustics: unknown | null;
  wave_stats?: unknown | null;
  location?: LocationSnapshot | null;
  ts: string;
};

export type FileItem = {
  file_id: string;
  filename: string;
  type: string;
  source: string;
  size_bytes: number | null;
  timestamp: string | null;
  available: boolean;
  status: string;
  reason?: string | null;
  path?: string | null;
  payload?: unknown;
};

async function httpGet<T>(url: string): Promise<T> {
  const r = await fetch(url, { method: "GET" });
  if (!r.ok) {
    throw new Error(`GET ${url} -> ${r.status}`);
  }
  return (await r.json()) as T;
}

export function getApiBaseUrl(): string {
  // Priority: localStorage override → env var → default dev
  const ls = typeof window !== "undefined" ? window.localStorage.getItem("nereus.apiBaseUrl") : null;
  return (ls && ls.trim()) || (import.meta.env.VITE_API_BASE as string | undefined) || "http://127.0.0.1:8000/v1";
}

export function createApiClient(opts?: Partial<ApiClientOptions>) {
  const baseUrl = (opts?.baseUrl || getApiBaseUrl()).replace(/\/+$/, "");
  return {
    baseUrl,
    async listNodes(): Promise<Array<{ node_id: string; display_name?: string }>> {
      return await httpGet(`${baseUrl}/nodes`);
    },
    async getLatestSnapshots(nodeId: string): Promise<LatestSnapshots> {
      return await httpGet(`${baseUrl}/nodes/${encodeURIComponent(nodeId)}/snapshots/latest`);
    },
    async listFiles(): Promise<{ items: FileItem[] }> {
      return await httpGet(`${baseUrl}/files`);
    },
  };
}

