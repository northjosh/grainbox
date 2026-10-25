export const IMAGES = ["python", "debian", "alpine"] as const;

export type Image = (typeof IMAGES)[number];

export const MAX_CONCURRENT = 3;
export const SERVER_TIMEOUT_MS = 30_000;
export const MIN_EXPIRY_HOURS = 1;
export const MAX_EXPIRY_HOURS = 12;

export type RunOutcome = "success" | "bad-image" | "busy" | "timeout" | "error";

export interface RunResult {
  outcome: RunOutcome;
  httpStatus: number;
  stdout: string;
  durationMs: number;
}

export interface PersistentSandbox {
  id: string;
  name: string | null;
  image: Image | null;
  status: string | null;
  memory: number | null;
  cpu: number | null;
  createdAt: string;
  expiresAt: string;
}

async function readErrorBody(res: Response): Promise<string> {
  const raw = await res.text();
  if (!raw) return res.statusText || "Request failed";
  try {
    const parsed = JSON.parse(raw) as { error?: unknown };
    if (typeof parsed.error === "string") return parsed.error;
  } catch {
    return raw;
  }
  return raw;
}

function classify(status: number): RunOutcome {
  if (status === 200) return "success";
  if (status === 400) return "bad-image";
  if (status === 429) return "busy";
  if (status === 504) return "timeout";
  return "error";
}

export async function runCommand(
  image: Image,
  command: string,
  signal?: AbortSignal,
): Promise<RunResult> {
  const startedAt = performance.now();

  let res: Response;
  try {
    res = await fetch("/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image, command }),
      signal,
    });
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    throw aborted
      ? e
      : new Error("Could not reach the sandbox server. Is `pnpm dev` running in srv/?", {
          cause: e,
        });
  }

  const durationMs = Math.round(performance.now() - startedAt);

  if (!res.ok) {
    return {
      outcome: classify(res.status),
      httpStatus: res.status,
      stdout: await readErrorBody(res),
      durationMs,
    };
  }

  return {
    outcome: "success",
    httpStatus: res.status,
    stdout: await res.text(),
    durationMs,
  };
}

export async function checkHealth(signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch("/api/health", { signal });
    return res.ok;
  } catch {
    return false;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) throw new Error(await readErrorBody(res));
  return res.json() as Promise<T>;
}

export async function listSandboxes(query = ""): Promise<PersistentSandbox[]> {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  const suffix = params.size ? `?${params.toString()}` : "";
  const result = await requestJson<{ results: PersistentSandbox[] }>(`/api/sandboxes${suffix}`);
  return result.results;
}

export async function getSandbox(name: string): Promise<PersistentSandbox> {
  const result = await requestJson<{ sandbox: PersistentSandbox }>(
    `/api/sandboxes/${encodeURIComponent(name)}`,
  );
  return result.sandbox;
}

export interface SandboxResources {
  cpu: number;
  memory: number;
  disk: number;
}

export async function createSandbox(
  name: string,
  image: Image,
  resources: SandboxResources,
  expiry = MAX_EXPIRY_HOURS,
): Promise<PersistentSandbox> {
  const result = await requestJson<{ sandbox: PersistentSandbox }>("/api/sandboxes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, image, expiry, ...resources }),
  });
  return result.sandbox;
}

export async function executeSandboxCommand(name: string, command: string): Promise<string> {
  const result = await requestJson<{ stdout: string }>(
    `/api/sandboxes/${encodeURIComponent(name)}/exec`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ command }),
    },
  );
  return result.stdout;
}

export async function startSandbox(name: string): Promise<void> {
  const res = await fetch(`/api/sandboxes/${encodeURIComponent(name)}/start`, {
    method: "PUT",
  });
  if (!res.ok) throw new Error(await readErrorBody(res));
}

export async function pauseSandbox(name: string): Promise<void> {
  const res = await fetch(`/api/sandboxes/${encodeURIComponent(name)}/pause`, {
    method: "PUT",
  });
  if (!res.ok) throw new Error(await readErrorBody(res));
}

export async function stopSandbox(name: string): Promise<void> {
  const res = await fetch(`/api/sandboxes/${encodeURIComponent(name)}/stop`, {
    method: "PUT",
  });
  if (!res.ok) throw new Error(await readErrorBody(res));
}

export async function deleteSandbox(name: string): Promise<void> {
  const res = await fetch(`/api/sandboxes/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await readErrorBody(res));
}

export interface SandboxFile {
  path: string;
  kind: string;
  size: number;
  mode: number;
  modified?: number;
}

export async function listSandboxFiles(name: string, path = "/"): Promise<SandboxFile[]> {
  const params = new URLSearchParams({ path });
  const result = await requestJson<{ files: SandboxFile[] }>(
    `/api/sandboxes/${encodeURIComponent(name)}/files?${params.toString()}`,
    { method: "POST" },
  );
  return result.files;
}

export interface SandboxPort {
  id: string;
  /** Stored as text in the database, so it arrives as a string. */
  number: string;
  sandbox: string | null;
  url: string | null;
  createdAt: string;
}

export async function listPorts(name: string): Promise<SandboxPort[]> {
  const result = await requestJson<{ results: SandboxPort[] }>(
    `/api/sandboxes/${encodeURIComponent(name)}/ports`,
  );
  return result.results;
}

/** Listener port numbers found on the sandbox that are not exposed yet. */
export async function pollPorts(name: string): Promise<number[]> {
  const result = await requestJson<{ res: number[] }>(
    `/api/sandboxes/${encodeURIComponent(name)}/poll-ports`,
  );
  return result.res;
}

export async function exposePort(name: string, port: number): Promise<SandboxPort> {
  const result = await requestJson<{ port: SandboxPort }>(
    `/api/sandboxes/${encodeURIComponent(name)}/ports`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ port }),
    },
  );
  return result.port;
}

export async function closePort(name: string, id: string): Promise<void> {
  const res = await fetch(
    `/api/sandboxes/${encodeURIComponent(name)}/ports/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(await readErrorBody(res));
}

export interface SandboxSnapshot {
  id: string;
  name: string;
  /** Internal id of the sandbox the snapshot was taken from. */
  sandbox: string;
  createdAt: string;
}

export async function createSnapshot(sandboxName: string, name: string): Promise<SandboxSnapshot> {
  const result = await requestJson<{ snapshot: SandboxSnapshot | SandboxSnapshot[] }>(
    `/api/sandboxes/${encodeURIComponent(sandboxName)}/snapshot`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    },
  );
  const created = Array.isArray(result.snapshot) ? result.snapshot[0] : result.snapshot;
  if (!created) throw new Error("snapshot failed");
  return created;
}

/** Returns the user's snapshots; tolerates a raw array or `{ snapshots }`/`{ results }`. */
export async function listSnapshots(): Promise<SandboxSnapshot[]> {
  const result = await requestJson<
    SandboxSnapshot[] | { snapshots?: SandboxSnapshot[]; results?: SandboxSnapshot[] }
  >("/api/snapshots");
  if (Array.isArray(result)) return result;
  return result.snapshots ?? result.results ?? [];
}

export async function restoreSnapshot(id: string, name: string): Promise<PersistentSandbox> {
  const result = await requestJson<{ sandbox: PersistentSandbox }>(
    `/api/snapshots/${encodeURIComponent(id)}/restore`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    },
  );
  return result.sandbox;
}

/** The backend resolves the `:id` param against the snapshot name, not the row id. */
export async function deleteSnapshot(name: string): Promise<void> {
  const res = await fetch(`/api/snapshots/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await readErrorBody(res));
}
