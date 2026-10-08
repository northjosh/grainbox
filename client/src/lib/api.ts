export const IMAGES = ["python", "debian", "alpine"] as const;

export type Image = (typeof IMAGES)[number];

export const MAX_CONCURRENT = 3;
export const SERVER_TIMEOUT_MS = 30_000;

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

export async function createSandbox(name: string, image: Image): Promise<PersistentSandbox> {
  const result = await requestJson<{ sandbox: PersistentSandbox }>("/api/sandboxes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, image }),
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

export async function deleteSandbox(name: string): Promise<void> {
  const res = await fetch(`/api/sandboxes/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await readErrorBody(res));
}
