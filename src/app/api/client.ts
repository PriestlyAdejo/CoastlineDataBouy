export type ApiClientOptions = {
  baseUrl: string;
};

export type LatestSnapshots = {
  node_id: string;
  telemetry: unknown | null;
  env: unknown | null;
  health: unknown | null;
  acoustics: unknown | null;
  ts: string;
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
  };
}

